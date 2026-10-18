import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

import { logger } from './logger.js';

/**
 * Native Windows System Tray Script using .NET System.Windows.Forms.NotifyIcon.
 * Uses zero external npm dependencies and is compatible with Deno cross-compilation.
 */
const WINDOWS_TRAY_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Automatically hide the console window on Windows if launched in tray mode
try {
    Add-Type -Name Win32 -Namespace Native -MemberDefinition '
        [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
    ' -ErrorAction SilentlyContinue
    $hwnd = [Native.Win32]::GetConsoleWindow()
    if ($hwnd -ne [IntPtr]::Zero) {
        [Native.Win32]::ShowWindow($hwnd, 0) | Out-Null
    }
} catch {}

[System.Windows.Forms.Application]::EnableVisualStyles()

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Application
$notify.Text = "WC Attendance Sync - Active"
$notify.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$statusItem = $menu.Items.Add("Status: Watching")
$statusItem.Enabled = $false

$targetDate = if ($args.Length -gt 0) { $args[0] } else { (Get-Date).ToString("yyyy-MM-dd") }
$dateItem = $menu.Items.Add("Date: " + $targetDate)
$dateItem.Enabled = $false

$null = $menu.Items.Add("-")

$syncNowItem = $menu.Items.Add("Sync Now")
$syncNowItem.add_Click({
    [Console]::Out.WriteLine('{"event":"sync_now"}')
    [Console]::Out.Flush()
})

$null = $menu.Items.Add("-")

$viewLogsItem = $menu.Items.Add("View Logs...")
$viewLogsItem.add_Click({
    [Console]::Out.WriteLine('{"event":"view_logs"}')
    [Console]::Out.Flush()
})

$openConfigItem = $menu.Items.Add("Settings (.env)...")
$openConfigItem.add_Click({
    [Console]::Out.WriteLine('{"event":"open_config"}')
    [Console]::Out.Flush()
})

$null = $menu.Items.Add("-")

$exitItem = $menu.Items.Add("Exit Attendance Sync")
$exitItem.add_Click({
    [Console]::Out.WriteLine('{"event":"exit"}')
    [Console]::Out.Flush()
    $notify.Visible = $false
    [System.Windows.Forms.Application]::Exit()
})

$notify.ContextMenuStrip = $menu

$queue = [System.Collections.Concurrent.ConcurrentQueue[string]]::new()

$thread = [System.Threading.Thread]::new([System.Threading.ThreadStart]{
    while ($true) {
        $line = [Console]::In.ReadLine()
        if ($null -eq $line) {
            $queue.Enqueue('{"action":"exit"}')
            break
        }
        $queue.Enqueue($line)
    }
})
$thread.IsBackground = $true
$thread.Start()

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 200
$timer.add_Tick({
    $item = $null
    while ($queue.TryDequeue([ref]$item)) {
        if (-not [string]::IsNullOrWhiteSpace($item)) {
            try {
                $cmd = $item | ConvertFrom-Json
                if ($cmd.action -eq "notify") {
                    $iconType = [System.Windows.Forms.ToolTipIcon]::Info
                    if ($cmd.type -eq "Warning") { $iconType = [System.Windows.Forms.ToolTipIcon]::Warning }
                    elseif ($cmd.type -eq "Error") { $iconType = [System.Windows.Forms.ToolTipIcon]::Error }
                    $notify.ShowBalloonTip(3000, [string]$cmd.title, [string]$cmd.message, $iconType)
                }
                elseif ($cmd.action -eq "status") {
                    if ($cmd.status) { $statusItem.Text = [string]$cmd.status }
                    if ($cmd.tooltip) {
                        $tip = [string]$cmd.tooltip
                        $notify.Text = $tip.Substring(0, [Math]::Min(63, $tip.Length))
                    }
                }
                elseif ($cmd.action -eq "date") {
                    if ($cmd.date) { $dateItem.Text = "Date: " + [string]$cmd.date }
                }
                elseif ($cmd.action -eq "exit") {
                    $notify.Visible = $false
                    $timer.Stop()
                    [System.Windows.Forms.Application]::Exit()
                }
            } catch {}
        }
    }
})
$timer.Start()

[Console]::Out.WriteLine('{"event":"ready"}')
[Console]::Out.Flush()

[System.Windows.Forms.Application]::Run()
`;

export class SystemTray {
  /**
   * @param {Object} options
   * @param {string} [options.targetDate]
   * @param {Function} [options.onSyncNow]
   * @param {Function} [options.onViewLogs]
   * @param {Function} [options.onOpenConfig]
   * @param {Function} [options.onExit]
   */
  constructor(options = {}) {
    this.options = options;
    this.child = null;
    this.scriptPath = null;
    this.isReady = false;
  }

  /**
   * Start the System Tray bridge.
   */
  init() {
    if (process.platform === 'win32') {
      this._initWindows();
    } else if (process.platform === 'darwin') {
      logger.info('System Tray active (macOS notification mode).');
      this.isReady = true;
    } else {
      logger.info('System Tray is optimized for Windows. Running in standard watch mode.');
      this.isReady = true;
    }
  }

  _initWindows() {
    try {
      this.scriptPath = path.join(os.tmpdir(), 'wc_attendance_tray.ps1');
      fs.writeFileSync(this.scriptPath, WINDOWS_TRAY_SCRIPT, 'utf-8');

      this.child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          this.scriptPath,
          this.options.targetDate || '',
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        },
      );

      const rl = readline.createInterface({
        input: this.child.stdout,
        terminal: false,
      });

      rl.on('line', (line) => {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed.event === 'ready') {
            this.isReady = true;
            logger.info('Windows System Tray icon initialized successfully.');
          } else if (parsed.event === 'sync_now') {
            logger.info('[TRAY] "Sync Now" triggered by user.');
            this.options.onSyncNow?.();
          } else if (parsed.event === 'view_logs') {
            logger.info('[TRAY] "View Logs" opened by user.');
            this.options.onViewLogs?.();
          } else if (parsed.event === 'open_config') {
            logger.info('[TRAY] "Settings" opened by user.');
            this.options.onOpenConfig?.();
          } else if (parsed.event === 'exit') {
            logger.info('[TRAY] "Exit" selected by user.');
            this.options.onExit?.();
          }
        } catch {
          // Ignore non-json output
        }
      });

      this.child.on('error', (err) => {
        logger.warn(`Windows System Tray process error: ${err.message}`);
      });

      this.child.on('exit', () => {
        this.child = null;
        this.isReady = false;
      });
    } catch (err) {
      logger.warn(`Could not start Windows System Tray: ${err.message}`);
    }
  }

  /**
   * Display a native balloon/toast notification.
   * @param {Object} param0
   * @param {string} param0.title
   * @param {string} param0.message
   * @param {'Info'|'Warning'|'Error'} [param0.type='Info']
   */
  notify({ title, message, type = 'Info' }) {
    if (this.child && !this.child.killed) {
      try {
        const payload = JSON.stringify({
          action: 'notify',
          title: String(title),
          message: String(message),
          type,
        });
        this.child.stdin.write(payload + '\n');
      } catch {
        // Ignore pipe errors
      }
    } else if (process.platform === 'darwin') {
      try {
        const cleanMsg = String(message).replace(/["'\\]/g, ' ');
        const cleanTitle = String(title).replace(/["'\\]/g, ' ');
        spawn(
          'osascript',
          ['-e', `display notification "${cleanMsg}" with title "${cleanTitle}"`],
          {
            stdio: 'ignore',
          },
        );
      } catch {
        // Ignore osascript errors
      }
    } else if (process.platform === 'linux') {
      try {
        const cleanMsg = String(message).replace(/["'\\]/g, ' ');
        const cleanTitle = String(title).replace(/["'\\]/g, ' ');
        spawn('notify-send', [cleanTitle, cleanMsg], {
          stdio: 'ignore',
        });
      } catch {
        // Ignore notify-send errors
      }
    }
  }

  /**
   * Update status item and tooltip.
   * @param {string} status
   * @param {string} [tooltip]
   */
  updateStatus(status, tooltip) {
    if (this.child && !this.child.killed) {
      try {
        const payload = JSON.stringify({
          action: 'status',
          status: String(status),
          tooltip: tooltip ? String(tooltip) : undefined,
        });
        this.child.stdin.write(payload + '\n');
      } catch {
        // Ignore pipe errors
      }
    }
  }

  /**
   * Update the date menu item.
   * @param {string} date
   */
  updateDate(date) {
    if (this.child && !this.child.killed) {
      try {
        const payload = JSON.stringify({
          action: 'date',
          date: String(date),
        });
        this.child.stdin.write(payload + '\n');
      } catch {
        // Ignore pipe errors
      }
    }
  }

  /**
   * Shutdown the tray helper.
   */
  close() {
    if (this.child && !this.child.killed) {
      try {
        this.child.stdin.write(JSON.stringify({ action: 'exit' }) + '\n');
        this.child.kill();
      } catch {
        // Ignore
      }
      this.child = null;
    }

    if (this.scriptPath && fs.existsSync(this.scriptPath)) {
      try {
        fs.unlinkSync(this.scriptPath);
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Factory helper.
 */
export function createSystemTray(options) {
  return new SystemTray(options);
}
