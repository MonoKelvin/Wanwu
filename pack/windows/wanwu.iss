; 万物 Windows 安装包
; 由 pack/windows/pack.mjs 调用 ISCC，传入 /D 编译参数

#ifndef AppVersion
  #define AppVersion "0.0.0.0"
#endif
#ifndef SetupVersion
  #define SetupVersion "0.0.0"
#endif
#ifndef OutputBase
  #define OutputBase "wanwu-win-x64-0.0.0"
#endif
#ifndef OutputDir
  #define OutputDir "."
#endif
#ifndef StageDir
  #define StageDir "."
#endif
#ifndef AppExeName
  #define AppExeName "Wanwu.exe"
#endif
#ifndef ChineseLangFile
  #define ChineseLangFile "compiler:Default.isl"
#endif

#define MyAppName "万物"
#define MyAppPublisher "MonoStudio"
#define MyAppURL "https://github.com/MonoKelvin/Wanwu"
#define GitHubReleasesURL "https://github.com/MonoKelvin/Wanwu/releases"
#define AppFolderName "Wanwu"

[Setup]
AppId={{A3B8C9D0-4E5F-6A7B-8C9D-0E1F2A3B4C5D}
AppName={#MyAppName}
AppVersion={#SetupVersion}
AppVerName={#MyAppName} {#SetupVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={commonpf32}\{#AppFolderName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=no
AllowRootDirectory=no
UsePreviousAppDir=no
DirExistsWarning=no
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBase}
Compression=lzma2/ultra64
SolidCompression=yes
LZMADictionarySize=1048576
LZMANumFastBytes=273
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
ShowLanguageDialog=no
; 相对本 .iss 所在目录 pack/windows/ → pack/app.ico（由 npm run logo:ico 生成）
SetupIconFile={#SourcePath}\..\app.ico
UninstallDisplayIcon={#SourcePath}\..\app.ico
VersionInfoVersion={#AppVersion}
VersionInfoProductName={#MyAppName}
VersionInfoCompany={#MyAppPublisher}
ChangesAssociations=no

[Languages]
Name: "chinesesimplified"; MessagesFile: "{#ChineseLangFile}"

[Tasks]
Name: "desktopicon"; Description: "桌面快捷方式"; GroupDescription: "附加选项:"

; 图鉴数据包单独分发，由安装向导复制到用户数据目录
[Files]
Source: "{#StageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{#SourcePath}\..\app.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{#SourcePath}\..\app.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "启动万物"; Flags: nowait postinstall skipifsilent
Filename: "{#GitHubReleasesURL}"; Description: "打开发布页"; Flags: postinstall shellexec skipifsilent

#include "wizard.iss"
