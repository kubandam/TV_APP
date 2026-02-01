import { useEffect, useRef, useCallback } from 'react';
import { loadLastCommandId, saveLastCommandId } from './storage/apiConfig';
import { API_BASE_URL, API_KEY, DEVICE_ID } from './config/api';

export type Command = {
  id: number;
  type: string;
  payload: any;
  created_at?: string;
};

export type CommandPollingOptions = {
  enabled?: boolean;
  pollInterval?: number; // in milliseconds, default 500
  maxCommandAge?: number; // maximum age of commands to process in seconds (default: 30)
  showAlerts?: boolean; // show alert popups (default: false)
};

/**
 * Hook for polling commands from the API
 * Automatically handles switch_channel commands
 * 
 * @param switchChannelFn Function to call when a switch_channel command is received
 * @param options Configuration options
 */
export function useCommandPolling(
  switchChannelFn: (channel: number) => Promise<void> | void,
  options: CommandPollingOptions = {}
) {
  const {
    enabled = true,
    pollInterval = 500,
    maxCommandAge = 30, // Only process commands from last 30 seconds
    showAlerts = false, // Don't show alert popups by default
  } = options;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);
  const isFirstPollRef = useRef<boolean>(true);

  // Load last command ID on mount
  useEffect(() => {
    if (enabled) {
      loadLastCommandId().then(lastId => {
        lastIdRef.current = lastId;
        console.log(`🚀 [Polling] Initialized - Device: ${DEVICE_ID}, Last Command ID: ${lastId}`);
      });
    }
  }, [enabled]);

  const poll = useCallback(async () => {
    // Prevent concurrent polls
    if (isPollingRef.current) {
      return;
    }

    try {
      isPollingRef.current = true;

      // Load current last command ID
      const lastId = lastIdRef.current;

      // Poll for new commands
      // Endpoint: GET /v1/commands/pull?after_id={after_id}&limit={limit}
      // Headers: X-API-Key, X-Device-Id
      const url = `${API_BASE_URL}/v1/commands/pull?after_id=${lastId}&limit=20`;
      
      // Debug logging (only every 10th poll to avoid spam)
      const shouldLog = Math.random() < 0.05; // 5% chance (cca každých 10 sekúnd pri 500ms intervale)
      if (shouldLog) {
        console.log(`🔍 [Polling] Checking for commands (after_id=${lastId})...`);
      }
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': API_KEY,
          'X-Device-Id': DEVICE_ID,
        },
      });

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.status} ${response.statusText}`);
      }

      const commands: Command[] = await response.json();

      if (commands.length > 0) {
        console.log(`\n📥 [Polling] Received ${commands.length} command(s)`);
      }

      // Filter out old commands (only process recent ones)
      const now = new Date();
      const recentCommands = commands.filter(cmd => {
        if (!cmd.created_at) return true; // Process if no timestamp
        
        const cmdTime = new Date(cmd.created_at);
        const ageInSeconds = (now.getTime() - cmdTime.getTime()) / 1000;
        
        if (ageInSeconds > maxCommandAge) {
          console.log(`⏭️ [Polling] Skipping old command ${cmd.id} (age: ${ageInSeconds.toFixed(1)}s)`);
          // Still update lastId to skip this command
          lastIdRef.current = Math.max(lastIdRef.current, cmd.id);
          return false;
        }
        
        return true;
      });

      // On first poll after app start, skip all commands to start fresh
      if (isFirstPollRef.current && recentCommands.length > 0) {
        console.log(`🆕 [Polling] First poll - skipping ${recentCommands.length} existing commands, starting fresh`);
        // Update lastId to latest command
        const maxId = Math.max(...commands.map(c => c.id));
        lastIdRef.current = maxId;
        await saveLastCommandId(maxId);
        isFirstPollRef.current = false;
        return;
      }

      isFirstPollRef.current = false;

      // Process each recent command
      for (const cmd of recentCommands) {
        // Update last command ID
        lastIdRef.current = Math.max(lastIdRef.current, cmd.id);

        console.log(`\n📨 [Polling] Processing command:`, {
          id: cmd.id,
          type: cmd.type,
          payload: cmd.payload,
          age: cmd.created_at ? `${((now.getTime() - new Date(cmd.created_at).getTime()) / 1000).toFixed(1)}s` : 'unknown',
        });

        // Handle switch_channel command
        if (cmd.type === 'switch_channel') {
          const channel = cmd.payload?.channel;
          if (typeof channel === 'number') {
            console.log(`\n🔄 [Polling] Switching to channel ${channel}...`);

            try {
              // Switch channel on TV
              await switchChannelFn(channel);
              
              console.log(`✅ [Polling] Successfully switched to channel ${channel}`);
              console.log(`📤 [Polling] Sending ACK for command ${cmd.id}`);

              // Acknowledge success
              await acknowledgeCommand(cmd.id, 'done', { channel });
              
              console.log(`✅ [Polling] Command ${cmd.id} acknowledged successfully`);
            } catch (error) {
              console.error(`❌ [Polling] Failed to switch channel ${channel}:`, error);
              
              // Acknowledge failure
              await acknowledgeCommand(
                cmd.id,
                'failed',
                { error: error instanceof Error ? error.message : String(error) }
              );
            }
          } else {
            console.warn(`⚠️ [Polling] Invalid channel number in command:`, cmd);
            await acknowledgeCommand(
              cmd.id,
              'failed',
              { error: 'Invalid channel number' }
            );
          }
        } else {
          console.log(`ℹ️ [Polling] Unknown command type: ${cmd.type}`);
        }
      }

      // Save last command ID
      if (lastIdRef.current > lastId) {
        await saveLastCommandId(lastIdRef.current);
      }
    } catch (error) {
      console.error('[Polling] Error during poll:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [switchChannelFn, maxCommandAge]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log(`▶️ [Polling] Starting polling (interval: ${pollInterval}ms)`);
    
    // Start polling immediately, then set interval
    poll();
    intervalRef.current = setInterval(poll, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollInterval, poll]);
}

/**
 * Acknowledge a command to the API
 * Endpoint: POST /v1/commands/{command_id}/ack
 * Body: { status: "done" | "failed", result: {...} }
 */
async function acknowledgeCommand(
  commandId: number,
  status: 'done' | 'failed',
  result: any
): Promise<void> {
  try {
    const url = `${API_BASE_URL}/v1/commands/${commandId}/ack`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Device-Id': DEVICE_ID,
      },
      body: JSON.stringify({ status, result }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Acknowledge failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    if (data.ok) {
      console.log(`✅ [Polling] Command ${commandId} acknowledged successfully`);
    }
  } catch (error) {
    console.error(`❌ [Polling] Failed to acknowledge command ${commandId}:`, error);
  }
}
