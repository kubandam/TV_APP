import { useEffect, useRef, useCallback } from 'react';
import { loadLastCommandId, saveLastCommandId } from './storage/apiConfig';
import { API_BASE_URL, API_KEY, DEVICE_ID } from './config/api';

export type Command = {
  id: number;
  type: string;
  payload: any;
  status: string;
  created_at?: string;
};

export type CommandPollingOptions = {
  enabled?: boolean;
  pollInterval?: number; // in milliseconds, default 500
  showAlerts?: boolean; // show alert popups (default: false)
};

/**
 * Hook for polling commands from the API
 * NEW BEHAVIOR: API returns only the LATEST pending command
 * We execute it if we haven't seen this command ID before
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
    showAlerts = false,
  } = options;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProcessedIdRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);
  const isFirstPollRef = useRef<boolean>(true);

  // Load last processed command ID on mount
  useEffect(() => {
    if (enabled) {
      loadLastCommandId().then(lastId => {
        lastProcessedIdRef.current = lastId;
        console.log(`🚀 [Polling] Initialized - Device: ${DEVICE_ID}, Last Processed ID: ${lastId}`);
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

      // Poll for the LATEST pending command (no after_id needed)
      // API now returns only the most recent pending command
      const url = `${API_BASE_URL}/v1/commands/pull`;
      
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

      // API returns array with 0 or 1 command (only latest pending)
      if (commands.length === 0) {
        // No pending commands - this is normal
        return;
      }

      const cmd = commands[0];
      
      // Check if this is a new command (we haven't processed it yet)
      if (cmd.id <= lastProcessedIdRef.current) {
        // Already processed this command
        return;
      }

      console.log(`\n📥 [Polling] Received NEW command #${cmd.id}`);

      // On first poll after app start, skip existing command to start fresh
      if (isFirstPollRef.current) {
        console.log(`🆕 [Polling] First poll - skipping existing command ${cmd.id}, starting fresh`);
        lastProcessedIdRef.current = cmd.id;
        await saveLastCommandId(cmd.id);
        isFirstPollRef.current = false;
        return;
      }

      isFirstPollRef.current = false;

      // Update last processed ID
      lastProcessedIdRef.current = cmd.id;
      await saveLastCommandId(cmd.id);

      console.log(`📨 [Polling] Processing command:`, {
        id: cmd.id,
        type: cmd.type,
        payload: cmd.payload,
        status: cmd.status,
      });

      // Handle switch_channel command
      if (cmd.type === 'switch_channel') {
        const channel = cmd.payload?.channel;
        const reason = cmd.payload?.reason;
        
        if (typeof channel === 'number') {
          console.log(`\n🔄 [Polling] Switching to channel ${channel} (reason: ${reason || 'unknown'})...`);

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
    } catch (error) {
      console.error('[Polling] Error during poll:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [switchChannelFn]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset first poll flag when disabling
      isFirstPollRef.current = true;
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
