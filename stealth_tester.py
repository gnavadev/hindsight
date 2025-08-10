#!/usr/bin/env python3
"""
DRM Stealth Testing Suite - Python Edition
Tests various detection methods that monitoring tools like Sherlock might use
"""

import psutil
import time
import json
import subprocess
import sys
import os
import threading
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import win32gui
import win32process
import win32con
import win32api
import win32security
from dataclasses import dataclass
import ctypes
from ctypes import wintypes
import mss
import platform

# Install required packages:
# pip install psutil pywin32 mss pillow

@dataclass
class TestResult:
    test: str
    passed: bool
    details: str
    severity: str  # 'low', 'medium', 'high', 'critical'
    timestamp: str

class StealthTester:
    def __init__(self, process_name: str, window_title: str = ""):
        self.process_name = process_name.lower()
        self.window_title = window_title.lower()
        self.results: List[TestResult] = []
        self.target_processes = []
        self.target_windows = []
        
        print(f"🔍 Initializing stealth tests for: {process_name}")
        print(f"🎯 Target window title: {window_title or 'Any'}")
        print(f"🖥️  Platform: {platform.system()} {platform.release()}")
        print("=" * 60)

    def add_result(self, test: str, passed: bool, details: str, severity: str):
        """Add a test result with console output"""
        result = TestResult(
            test=test,
            passed=passed,
            details=details,
            severity=severity,
            timestamp=datetime.now().isoformat()
        )
        self.results.append(result)
        
        # Console output with colors and emojis
        icon = "✅" if passed else "❌"
        severity_icons = {"low": "🟢", "medium": "🟡", "high": "🟠", "critical": "🔴"}
        severity_icon = severity_icons.get(severity, "⚪")
        
        print(f"{icon} {severity_icon} {test}")
        print(f"   └─ {details}")

    def find_target_processes(self) -> List[psutil.Process]:
        """Find all processes matching our target"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'exe', 'cmdline']):
            try:
                if self.process_name in proc.info['name'].lower():
                    processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return processes

    def find_target_windows(self) -> List[Tuple[int, str]]:
        """Find all windows matching our target"""
        windows = []
        
        def enum_window_callback(hwnd, param):
            try:
                if win32gui.IsWindowVisible(hwnd):
                    title = win32gui.GetWindowText(hwnd)
                    if title and (not self.window_title or self.window_title in title.lower()):
                        windows.append((hwnd, title))
            except Exception:
                pass
            return True
        
        win32gui.EnumWindows(enum_window_callback, None)
        return windows

    def test_psutil_detection(self):
        """Test detection via psutil (Python's most common process library)"""
        processes = self.find_target_processes()
        
        if processes:
            details = f"Found {len(processes)} processes: {[p.info['name'] for p in processes]}"
            self.add_result("PSUtil Process Detection", False, details, "high")
            self.target_processes = processes
        else:
            self.add_result("PSUtil Process Detection", True, "No processes detected by psutil", "low")

    def test_tasklist_detection(self):
        """Test detection via Windows tasklist command"""
        try:
            result = subprocess.run(['tasklist', '/fo', 'csv'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                output = result.stdout.lower()
                detected = self.process_name in output
                
                if detected:
                    # Count occurrences
                    count = output.count(self.process_name)
                    self.add_result("TaskList Detection", False, 
                                  f"Process detected {count} times in tasklist", "high")
                else:
                    self.add_result("TaskList Detection", True, 
                                  "Process hidden from tasklist", "low")
            else:
                self.add_result("TaskList Detection", True, 
                              "TaskList command failed (access restricted?)", "medium")
                
        except Exception as e:
            self.add_result("TaskList Detection", True, 
                          f"TaskList test failed: {e}", "medium")

    def test_wmic_detection(self):
        """Test detection via WMIC (Windows Management Instrumentation)"""
        try:
            result = subprocess.run(['wmic', 'process', 'get', 'name,processid,executablepath', '/format:csv'], 
                                  capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0:
                output = result.stdout.lower()
                detected = self.process_name in output
                
                if detected:
                    self.add_result("WMIC Detection", False, 
                                  "Process detected by WMIC queries", "critical")
                else:
                    self.add_result("WMIC Detection", True, 
                                  "Process hidden from WMIC", "low")
            else:
                self.add_result("WMIC Detection", True, 
                              "WMIC access blocked or failed", "medium")
                
        except Exception as e:
            self.add_result("WMIC Detection", True, 
                          f"WMIC test failed: {e}", "medium")

    def test_powershell_detection(self):
        """Test detection via PowerShell Get-Process"""
        try:
            ps_command = f'Get-Process | Where-Object {{$_.ProcessName -like "*{self.process_name}*"}} | Select-Object ProcessName,Id,MainWindowTitle'
            
            result = subprocess.run(['powershell', '-Command', ps_command], 
                                  capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0:
                output = result.stdout.strip()
                # Check if we got actual results (not just headers)
                lines = [line for line in output.split('\n') if line.strip()]
                detected = len(lines) > 2 and self.process_name in output.lower()
                
                if detected:
                    self.add_result("PowerShell Detection", False, 
                                  f"Process detected by Get-Process: {len(lines)-2} instances", "high")
                else:
                    self.add_result("PowerShell Detection", True, 
                                  "Process hidden from PowerShell Get-Process", "low")
            else:
                self.add_result("PowerShell Detection", True, 
                              "PowerShell execution blocked", "medium")
                
        except Exception as e:
            self.add_result("PowerShell Detection", True, 
                          f"PowerShell test failed: {e}", "medium")

    def test_window_enumeration(self):
        """Test window detection via Win32 API"""
        windows = self.find_target_windows()
        
        if windows:
            window_details = [f"HWND:{hwnd} '{title}'" for hwnd, title in windows[:3]]
            self.add_result("Win32 Window Enumeration", False, 
                          f"Found {len(windows)} windows: {window_details}", "critical")
            self.target_windows = windows
        else:
            self.add_result("Win32 Window Enumeration", True, 
                          "No windows detected by EnumWindows", "low")

    def test_taskbar_presence(self):
        """Test if windows appear in taskbar"""
        if not self.target_windows:
            self.add_result("Taskbar Presence", True, 
                          "No windows to test taskbar presence", "low")
            return
            
        taskbar_windows = 0
        for hwnd, title in self.target_windows:
            try:
                # Check if window has taskbar button
                ex_style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
                style = win32gui.GetWindowLong(hwnd, win32con.GWL_STYLE)
                
                # Windows with WS_EX_TOOLWINDOW don't appear in taskbar
                # Windows with WS_EX_APPWINDOW do appear in taskbar
                if not (ex_style & win32con.WS_EX_TOOLWINDOW) and (style & win32con.WS_VISIBLE):
                    taskbar_windows += 1
                    
            except Exception:
                continue
                
        if taskbar_windows > 0:
            self.add_result("Taskbar Presence", False, 
                          f"{taskbar_windows} windows likely visible in taskbar", "medium")
        else:
            self.add_result("Taskbar Presence", True, 
                          "Windows hidden from taskbar", "low")

    def test_alt_tab_visibility(self):
        """Test Alt+Tab visibility"""
        if not self.target_windows:
            self.add_result("Alt+Tab Visibility", True, 
                          "No windows to test Alt+Tab visibility", "low")
            return
            
        alt_tab_visible = 0
        for hwnd, title in self.target_windows:
            try:
                # Check if window would appear in Alt+Tab
                if win32gui.IsWindowVisible(hwnd):
                    ex_style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
                    if not (ex_style & win32con.WS_EX_TOOLWINDOW):
                        # Check if it has a non-empty title (Alt+Tab usually shows titled windows)
                        if title.strip():
                            alt_tab_visible += 1
            except Exception:
                continue
                
        if alt_tab_visible > 0:
            self.add_result("Alt+Tab Visibility", False, 
                          f"{alt_tab_visible} windows likely visible in Alt+Tab", "medium")
        else:
            self.add_result("Alt+Tab Visibility", True, 
                          "Windows hidden from Alt+Tab", "low")

    def test_process_tree(self):
        """Test process parent-child relationships"""
        if not self.target_processes:
            self.add_result("Process Tree Analysis", True, 
                          "No processes to analyze", "low")
            return
            
        suspicious_parents = []
        legitimate_parents = ['explorer.exe', 'services.exe', 'winlogon.exe', 'dwm.exe']
        
        for proc in self.target_processes:
            try:
                parent = proc.parent()
                if parent:
                    parent_name = parent.name().lower()
                    if parent_name not in legitimate_parents:
                        suspicious_parents.append(f"{proc.name()}→{parent_name}")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        if suspicious_parents:
            self.add_result("Process Tree Analysis", False, 
                          f"Suspicious parent processes: {suspicious_parents}", "medium")
        else:
            self.add_result("Process Tree Analysis", True, 
                          "Process tree appears legitimate", "low")

    def test_network_connections(self):
        """Test for suspicious network connections"""
        if not self.target_processes:
            self.add_result("Network Connections", True, 
                          "No processes to test network connections", "low")
            return
            
        total_connections = 0
        suspicious_connections = []
        
        for proc in self.target_processes:
            try:
                connections = proc.connections()
                total_connections += len(connections)
                
                for conn in connections:
                    # Flag non-localhost connections as potentially suspicious for DRM
                    if conn.raddr and conn.raddr.ip not in ['127.0.0.1', '::1']:
                        suspicious_connections.append(f"{conn.raddr.ip}:{conn.raddr.port}")
                        
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        if suspicious_connections:
            self.add_result("Network Connections", False, 
                          f"External connections detected: {suspicious_connections[:3]}", "medium")
        elif total_connections > 0:
            self.add_result("Network Connections", True, 
                          f"Only localhost connections detected ({total_connections})", "low")
        else:
            self.add_result("Network Connections", True, 
                          "No network connections detected", "low")

    def test_memory_usage(self):
        """Test memory usage patterns"""
        if not self.target_processes:
            self.add_result("Memory Usage", True, 
                          "No processes to test memory usage", "low")
            return
            
        total_memory = 0
        high_memory_procs = []
        
        for proc in self.target_processes:
            try:
                memory_info = proc.memory_info()
                memory_mb = memory_info.rss / 1024 / 1024
                total_memory += memory_mb
                
                # Flag processes using more than 500MB as potentially suspicious
                if memory_mb > 500:
                    high_memory_procs.append(f"{proc.name()}: {memory_mb:.1f}MB")
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        if high_memory_procs:
            self.add_result("Memory Usage", False, 
                          f"High memory usage detected: {high_memory_procs}", "medium")
        else:
            self.add_result("Memory Usage", True, 
                          f"Normal memory usage: {total_memory:.1f}MB total", "low")

    def test_cpu_usage(self):
        """Test CPU usage patterns over time"""
        if not self.target_processes:
            self.add_result("CPU Usage", True, 
                          "No processes to test CPU usage", "low")
            return
            
        print("   📊 Monitoring CPU usage for 10 seconds...")
        
        cpu_samples = []
        for i in range(5):  # 5 samples over 10 seconds
            total_cpu = 0
            active_procs = 0
            
            for proc in self.target_processes:
                try:
                    cpu_percent = proc.cpu_percent()
                    total_cpu += cpu_percent
                    active_procs += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
            if active_procs > 0:
                avg_cpu = total_cpu / active_procs
                cpu_samples.append(avg_cpu)
                
            time.sleep(2)
            
        if cpu_samples:
            avg_cpu = sum(cpu_samples) / len(cpu_samples)
            max_cpu = max(cpu_samples)
            
            if max_cpu > 50:
                self.add_result("CPU Usage", False, 
                              f"High CPU usage detected: avg={avg_cpu:.1f}%, max={max_cpu:.1f}%", "medium")
            else:
                self.add_result("CPU Usage", True, 
                              f"Normal CPU usage: avg={avg_cpu:.1f}%, max={max_cpu:.1f}%", "low")
        else:
            self.add_result("CPU Usage", True, 
                          "No CPU usage data available", "low")

    def test_screen_capture_protection(self):
        """Test screen capture protection (simulates what Sherlock might do)"""
        try:
            print("   📸 Testing screen capture protection...")
            
            # Use MSS library to attempt screenshot
            with mss.mss() as sct:
                # Capture primary monitor
                monitor = sct.monitors[1]
                screenshot = sct.grab(monitor)
                
                # Save to temporary location
                temp_file = "temp_screenshot_test.png"
                mss.tools.to_png(screenshot.rgb, screenshot.size, output=temp_file)
                
                # Check if file was created and has reasonable size
                if os.path.exists(temp_file):
                    file_size = os.path.getsize(temp_file)
                    
                    if file_size > 1000:  # Reasonable screenshot size
                        self.add_result("Screen Capture Protection", False, 
                                      f"Screenshot successful ({file_size} bytes) - DRM protection may be bypassed", "critical")
                    else:
                        self.add_result("Screen Capture Protection", True, 
                                      "Screenshot blocked or corrupted - DRM protection working", "low")
                else:
                    self.add_result("Screen Capture Protection", True, 
                                  "Screenshot completely blocked", "low")
                    
        except Exception as e:
            self.add_result("Screen Capture Protection", True, 
                          f"Screenshot failed: {e} (DRM protection likely working)", "low")

    def test_process_injection_resistance(self):
        """Test resistance to process injection"""
        if not self.target_processes:
            self.add_result("Process Injection Resistance", True, 
                          "No processes to test injection resistance", "low")
            return
            
        injection_attempts = 0
        successful_injections = 0
        
        for proc in self.target_processes:
            try:
                # Attempt to open process with various access rights
                handle = None
                injection_attempts += 1
                
                try:
                    # Try to open with VM_WRITE access (needed for injection)
                    handle = win32api.OpenProcess(
                        win32con.PROCESS_VM_WRITE | win32con.PROCESS_VM_OPERATION, 
                        False, proc.pid
                    )
                    if handle:
                        successful_injections += 1
                        win32api.CloseHandle(handle)
                except Exception:
                    pass  # Access denied - good for security
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        if successful_injections > 0:
            self.add_result("Process Injection Resistance", False, 
                          f"{successful_injections}/{injection_attempts} processes vulnerable to injection", "high")
        else:
            self.add_result("Process Injection Resistance", True, 
                          f"All {injection_attempts} processes protected from injection", "low")

    def test_debugging_protection(self):
        """Test anti-debugging protection"""
        if not self.target_processes:
            self.add_result("Anti-Debugging Protection", True, 
                          "No processes to test debugging protection", "low")
            return
            
        debug_attempts = 0
        successful_debugs = 0
        
        for proc in self.target_processes:
            try:
                debug_attempts += 1
                
                # Try to open with debug access
                try:
                    handle = win32api.OpenProcess(
                        win32con.PROCESS_ALL_ACCESS, 
                        False, proc.pid
                    )
                    if handle:
                        # Try to debug the process
                        try:
                            win32api.DebugActiveProcess(proc.pid)
                            successful_debugs += 1
                            win32api.DebugActiveProcessStop(proc.pid)
                        except Exception:
                            pass  # Debug attach failed - good
                        finally:
                            win32api.CloseHandle(handle)
                except Exception:
                    pass  # Access denied - good for security
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        if successful_debugs > 0:
            self.add_result("Anti-Debugging Protection", False, 
                          f"{successful_debugs}/{debug_attempts} processes vulnerable to debugging", "critical")
        else:
            self.add_result("Anti-Debugging Protection", True, 
                          f"All {debug_attempts} processes protected from debugging", "low")

    def test_process_name_legitimacy(self):
        """Test if process names look legitimate"""
        if not self.target_processes:
            self.add_result("Process Name Legitimacy", True, 
                          "No processes to test name legitimacy", "low")
            return
            
        suspicious_names = []
        legitimate_patterns = [
            'windows', 'system', 'service', 'update', 'security', 
            'network', 'audio', 'display', 'manager', 'configuration'
        ]
        
        for proc in self.target_processes:
            try:
                name = proc.name().lower()
                # Check if name contains legitimate-sounding keywords
                is_legitimate = any(pattern in name for pattern in legitimate_patterns)
                
                if not is_legitimate:
                    suspicious_names.append(name)
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        if suspicious_names:
            self.add_result("Process Name Legitimacy", False, 
                          f"Suspicious process names: {suspicious_names}", "medium")
        else:
            self.add_result("Process Name Legitimacy", True, 
                          "Process names appear legitimate", "low")

    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting comprehensive stealth analysis...\n")
        
        # Core detection tests
        print("🔍 BASIC DETECTION TESTS")
        print("-" * 40)
        self.test_psutil_detection()
        self.test_tasklist_detection()
        self.test_wmic_detection()
        self.test_powershell_detection()
        
        print(f"\n🪟 WINDOW DETECTION TESTS")
        print("-" * 40)
        self.test_window_enumeration()
        self.test_taskbar_presence()
        self.test_alt_tab_visibility()
        
        print(f"\n⚡ BEHAVIOR ANALYSIS")
        print("-" * 40)
        self.test_process_tree()
        self.test_network_connections()
        self.test_memory_usage()
        self.test_cpu_usage()
        
        print(f"\n🛡️ SECURITY TESTS")
        print("-" * 40)
        self.test_screen_capture_protection()
        self.test_process_injection_resistance()
        self.test_debugging_protection()
        self.test_process_name_legitimacy()
        
        self.generate_report()

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("📊 STEALTH ANALYSIS REPORT")
        print("="*60)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r.passed])
        score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n🎯 OVERALL SCORE: {passed_tests}/{total_tests} ({score:.1f}%)")
        
        # Categorize results by severity
        critical_fails = [r for r in self.results if not r.passed and r.severity == 'critical']
        high_fails = [r for r in self.results if not r.passed and r.severity == 'high']
        medium_fails = [r for r in self.results if not r.passed and r.severity == 'medium']
        
        if critical_fails:
            print(f"\n🔴 CRITICAL ISSUES ({len(critical_fails)}):")
            for result in critical_fails:
                print(f"   ❌ {result.test}: {result.details}")
                
        if high_fails:
            print(f"\n🟠 HIGH PRIORITY ({len(high_fails)}):")
            for result in high_fails:
                print(f"   ❌ {result.test}: {result.details}")
                
        if medium_fails:
            print(f"\n🟡 MEDIUM PRIORITY ({len(medium_fails)}):")
            for result in medium_fails:
                print(f"   ❌ {result.test}: {result.details}")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if score < 70:
            print("   🚨 IMMEDIATE ACTION REQUIRED")
            print("   • Implement additional stealth measures")
            print("   • Address all critical and high priority issues")
            print("   • Consider process hollowing or rootkit techniques")
        elif score < 85:
            print("   ⚠️  GOOD STEALTH, NEEDS IMPROVEMENT")
            print("   • Address remaining high/medium priority issues")
            print("   • Implement advanced evasion techniques")
            print("   • Regular testing against new detection methods")
        else:
            print("   ✅ EXCELLENT STEALTH COVERAGE")
            print("   • Maintain current security posture")
            print("   • Monitor for new detection techniques")
            print("   • Consider this a strong DRM protection baseline")
            
        print(f"\n🔄 Remember: Detection evasion is an ongoing arms race!")
        print(f"💾 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    def save_detailed_report(self, filename: str = None):
        """Save detailed JSON report"""
        if filename is None:
            filename = f"stealth_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "target_process": self.process_name,
            "target_window": self.window_title,
            "platform": f"{platform.system()} {platform.release()}",
            "total_tests": len(self.results),
            "passed_tests": len([r for r in self.results if r.passed]),
            "score_percentage": (len([r for r in self.results if r.passed]) / len(self.results) * 100) if self.results else 0,
            "test_results": [
                {
                    "test": r.test,
                    "passed": r.passed,
                    "details": r.details,
                    "severity": r.severity,
                    "timestamp": r.timestamp
                }
                for r in self.results
            ],
            "summary": {
                "critical_issues": len([r for r in self.results if not r.passed and r.severity == 'critical']),
                "high_issues": len([r for r in self.results if not r.passed and r.severity == 'high']),
                "medium_issues": len([r for r in self.results if not r.passed and r.severity == 'medium']),
                "low_issues": len([r for r in self.results if not r.passed and r.severity == 'low'])
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(report_data, f, indent=2)
            
        print(f"\n💾 Detailed report saved to: {filename}")
        return filename

def main():
    """Main function to run stealth tests"""
    if len(sys.argv) < 2:
        print("Usage: python stealth_tester.py <process_name> [window_title]")
        print("Example: python stealth_tester.py NetworkConfiguration")
        print("Example: python stealth_tester.py MyDRMApp 'DRM Protected Content'")
        sys.exit(1)
        
    process_name = sys.argv[1]
    window_title = sys.argv[2] if len(sys.argv) > 2 else ""
    
    tester = StealthTester(process_name, window_title)
    tester.run_all_tests()
    tester.save_detailed_report()

if __name__ == "__main__":
    main()