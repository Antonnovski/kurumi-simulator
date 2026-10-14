# v0.12.2 启动器修复

旧启动器依赖系统默认浏览器，成功后控制台立即退出，浏览器交接无可见反馈。本补丁优先打开Edge/Chrome独立游戏窗口，保留启动状态、地址和错误信息，并写入.local/startup.log。缺文件时提示完整解压；重复启动复用本目录服务。CMD固定CRLF行尾，中文PowerShell固定UTF-8 BOM。浏览器存档与交易规则不变。

自动化验证用YENFX_NO_PAUSE=1抑制人工暂停，用Start-Game.cmd -NoBrowser只测试服务。常规双击应打开独立游戏窗口并保留控制台；关闭控制台不会停止游戏，Stop-Game.cmd会关闭本目录服务。
