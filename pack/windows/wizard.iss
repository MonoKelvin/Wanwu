[Code]
const
  CAppFolderName = 'Wanwu';
  CRegRoot = 'Software\MonoStudio\Wanwu';
  CLibraryPackFileName = 'library-data-pack.zip';
var
  WwSettingsPage: TWizardPage;
  WwDataDirEdit: TNewEdit;
  WwLibraryZipEdit: TNewEdit;
  DataPath: string;
  LibraryPackSource: string;
  GKeepUserDataOnUninstall: Boolean;
  GUninstallWelcomeConfirmed: Boolean;

function JsonEscapeBackslash(const S: string): string;
begin
  StringChangeEx(Result, '\', '\\', True);
end;

function RemoveBackslashUnlessRoot(const S: string): string;
begin
  Result := S;
  if (Length(Result) > 3) and (Copy(Result, Length(Result), 1) = '\') then
    SetLength(Result, Length(Result) - 1);
end;

function PathEndsWithWanwu(const P: string): Boolean;
begin
  Result := CompareText(ExtractFileName(RemoveBackslashUnlessRoot(P)), CAppFolderName) = 0;
end;

function EnsureAppInstallDir(const Raw: string): string;
var
  P: string;
begin
  P := RemoveBackslashUnlessRoot(Raw);
  if not PathEndsWithWanwu(P) then
    Result := P + '\' + CAppFolderName
  else
    Result := P;
end;

{ 数据目录即用户所选路径，不再自动创建 wanwu 子目录 }
function NormalizeDataDir(const Raw: string): string;
begin
  Result := RemoveBackslashUnlessRoot(Trim(Raw));
end;

function ElectronConfigDir: string;
begin
  Result := ExpandConstant('{userappdata}\wanwu');
end;

function DefaultDataDir: string;
begin
  Result := ElectronConfigDir;
end;

function WanwuPathConfigFile: string;
begin
  Result := ElectronConfigDir + '\wanwu-path.json';
end;

function RegDataPath: string;
begin
  if RegQueryStringValue(HKCU, CRegRoot, 'DataPath', Result) then
    Exit;
  Result := '';
end;

procedure WwBrowseDataDirClick(Sender: TObject);
var
  Dir: string;
begin
  Dir := WwDataDirEdit.Text;
  if BrowseForFolder('选择数据存放位置', Dir, True) then
    WwDataDirEdit.Text := Dir;
end;

procedure WwBrowseLibraryZipClick(Sender: TObject);
var
  Zip, InitDir: string;
begin
  Zip := WwLibraryZipEdit.Text;
  InitDir := '';
  if Zip <> '' then
    InitDir := ExtractFileDir(Zip);
  if GetOpenFileName(
    '选择图鉴资源包',
    Zip,
    InitDir,
    'ZIP 文件 (*.zip)|*.zip|所有文件 (*.*)|*.*',
    'zip') then
    WwLibraryZipEdit.Text := Zip;
end;

function ResolveLibraryPackSource(const DataDir: string): string;
var
  InData, InApp: string;
begin
  Result := Trim(WwLibraryZipEdit.Text);
  if (Result <> '') and FileExists(Result) then
    Exit;
  Result := '';
  InData := DataDir + '\' + CLibraryPackFileName;
  InApp := ExpandConstant('{app}') + '\' + CLibraryPackFileName;
  if FileExists(InData) then
    Result := InData
  else if FileExists(InApp) then
    Result := InApp;
end;

procedure CreateWwWizardPages;
var
  Top, RowH, Gap, W, BtnW: Integer;
  HintLabel, LblData, LblPack: TNewStaticText;
  BtnData, BtnPack: TNewButton;
begin
  WwSettingsPage := CreateCustomPage(
    wpSelectDir,
    '用户数据和资源设置',
    '设置数据位置与图鉴资源包'
  );

  Top := ScaleY(8);
  Gap := ScaleY(12);
  RowH := ScaleY(24);
  BtnW := ScaleX(76);
  W := WwSettingsPage.SurfaceWidth - ScaleX(24);

  HintLabel := TNewStaticText.Create(WwSettingsPage);
  HintLabel.Parent := WwSettingsPage.Surface;
  HintLabel.Left := ScaleX(0);
  HintLabel.Top := Top;
  HintLabel.Width := W;
  HintLabel.Height := ScaleY(72);
  HintLabel.AutoSize := False;
  HintLabel.WordWrap := True;
  HintLabel.Caption :=
    '1. 选择个人数据存放位置。' + #13#10 +
    '2. 图鉴资源包可留空（从安装目录查找）或选择 zip。' + #13#10 +
    '下载：{#GitHubReleasesURL}';
  Top := Top + HintLabel.Height + Gap;

  LblData := TNewStaticText.Create(WwSettingsPage);
  LblData.Parent := WwSettingsPage.Surface;
  LblData.Left := ScaleX(0);
  LblData.Top := Top;
  LblData.AutoSize := True;
  LblData.Caption := '数据目录';
  Top := Top + ScaleY(18);

  WwDataDirEdit := TNewEdit.Create(WwSettingsPage);
  WwDataDirEdit.Parent := WwSettingsPage.Surface;
  WwDataDirEdit.Left := ScaleX(0);
  WwDataDirEdit.Top := Top;
  WwDataDirEdit.Width := W - BtnW - ScaleX(10);
  WwDataDirEdit.Height := RowH;
  WwDataDirEdit.Text := DefaultDataDir;

  BtnData := TNewButton.Create(WwSettingsPage);
  BtnData.Parent := WwSettingsPage.Surface;
  BtnData.Left := WwDataDirEdit.Left + WwDataDirEdit.Width + ScaleX(10);
  BtnData.Top := Top;
  BtnData.Width := BtnW;
  BtnData.Height := RowH;
  BtnData.Caption := '浏览…';
  BtnData.OnClick := @WwBrowseDataDirClick;
  Top := Top + RowH + Gap;

  LblPack := TNewStaticText.Create(WwSettingsPage);
  LblPack.Parent := WwSettingsPage.Surface;
  LblPack.Left := ScaleX(0);
  LblPack.Top := Top;
  LblPack.AutoSize := True;
  LblPack.Caption := '资源包 zip（可选）';
  Top := Top + ScaleY(18);

  WwLibraryZipEdit := TNewEdit.Create(WwSettingsPage);
  WwLibraryZipEdit.Parent := WwSettingsPage.Surface;
  WwLibraryZipEdit.Left := ScaleX(0);
  WwLibraryZipEdit.Top := Top;
  WwLibraryZipEdit.Width := W - BtnW - ScaleX(10);
  WwLibraryZipEdit.Height := RowH;

  BtnPack := TNewButton.Create(WwSettingsPage);
  BtnPack.Parent := WwSettingsPage.Surface;
  BtnPack.Left := WwLibraryZipEdit.Left + WwLibraryZipEdit.Width + ScaleX(10);
  BtnPack.Top := Top;
  BtnPack.Width := BtnW;
  BtnPack.Height := RowH;
  BtnPack.Caption := '浏览…';
  BtnPack.OnClick := @WwBrowseLibraryZipClick;
end;

procedure WriteWanwuPathConfig(TargetPath, LibPackPath: String);
var
  ConfigDir, Json: string;
begin
  ConfigDir := ElectronConfigDir;
  ForceDirectories(ConfigDir);
  Json :=
    '{' + #13#10 +
    '  "wanwuPath": "' + JsonEscapeBackslash(TargetPath) + '"';
  if LibPackPath <> '' then
    Json := Json + ',' + #13#10 +
      '  "libraryPackPath": "' + JsonEscapeBackslash(LibPackPath) + '"';
  Json := Json + #13#10 + '}' + #13#10;
  SaveStringToFile(WanwuPathConfigFile, Json, False);
end;

procedure SaveInstallRegistry;
begin
  RegWriteStringValue(HKCU, CRegRoot, 'InstallPath', ExpandConstant('{app}'));
  RegWriteStringValue(HKCU, CRegRoot, 'DataPath', DataPath);
  RegWriteStringValue(HKCU, CRegRoot, 'ConfigDir', ElectronConfigDir);
  RegWriteStringValue(HKCU, CRegRoot, 'Version', '{#SetupVersion}');
  if LibraryPackSource <> '' then
    RegWriteStringValue(HKCU, CRegRoot, 'LibraryPackSource', LibraryPackSource);
end;

procedure RemoveInstallRegistry;
begin
  RegDeleteKeyIncludingSubkeys(HKCU, CRegRoot);
end;

function HasPreviousInstallRegistry: Boolean;
var
  S: string;
begin
  Result := RegQueryStringValue(HKCU, CRegRoot, 'InstallPath', S) and (S <> '');
end;

function TryReadDataPathFromConfig(var OutPath: string): Boolean;
var
  SL: TStringList;
  I, P: Integer;
  Line, Val: string;
begin
  Result := False;
  if not FileExists(WanwuPathConfigFile) then Exit;
  SL := TStringList.Create;
  try
    SL.LoadFromFile(WanwuPathConfigFile);
    for I := 0 to SL.Count - 1 do
    begin
      Line := Trim(SL[I]);
      if Pos('"wanwuPath"', Line) = 0 then
        Continue;
      P := Pos(':', Line);
      if P <= 0 then
        Continue;
      Val := Trim(Copy(Line, P + 1, MaxInt));
      StringChangeEx(Val, '"', '', True);
      StringChangeEx(Val, ',', '', True);
      if Val = '' then
        Continue;
      StringChangeEx(Val, '\\', '\', True);
      OutPath := Val;
      Result := True;
      Exit;
    end;
  finally
    SL.Free;
  end;
end;

function InstallLibraryPackToDataDir: string;
var
  Dest: string;
begin
  Result := '';
  if Trim(LibraryPackSource) = '' then
    Exit;
  if not FileExists(LibraryPackSource) then
    Exit;
  ForceDirectories(DataPath);
  Dest := DataPath + '\' + CLibraryPackFileName;
  if CopyFile(LibraryPackSource, Dest, False) then
    Result := Dest;
end;

procedure RunLibraryPackImport(const DataDir: string);
var
  ExePath, ZipPath, Params: string;
  ResultCode: Integer;
begin
  ZipPath := DataDir + '\' + CLibraryPackFileName;
  if not FileExists(ZipPath) then
    Exit;
  WizardForm.StatusLabel.Caption := '正在解压图鉴资源包到数据目录，请稍候…';
  WizardForm.ProgressGauge.Style := npbstMarquee;
  try
    ExePath := ExpandConstant('{app}\{#AppExeName}');
    Params :=
      '--installer-import-library-pack "' + DataDir + '" "' + ZipPath + '"';
    if Exec(ExePath, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    begin
      if (ResultCode <> 0) then
        MsgBox(
          '图鉴解压未完成（代码 ' + IntToStr(ResultCode) + '），可启动应用后重试。',
          mbInformation, MB_OK);
    end
    else
      MsgBox('无法运行图鉴导入，可启动应用后重试。', mbInformation, MB_OK);
  finally
    WizardForm.ProgressGauge.Style := npbstNormal;
    WizardForm.StatusLabel.Caption := '';
  end;
end;

function InitializeSetup: Boolean;
begin
  DataPath := '';
  LibraryPackSource := '';
  Result := True;
end;

procedure InitializeWizard;
var
  InstallDir, StoredData: string;
begin
  CreateWwWizardPages;

  if RegQueryStringValue(HKCU, CRegRoot, 'InstallPath', InstallDir) and (InstallDir <> '') then
    WizardForm.DirEdit.Text := InstallDir;

  StoredData := RegDataPath;
  if (StoredData = '') then
    TryReadDataPathFromConfig(StoredData);
  if StoredData <> '' then
    WwDataDirEdit.Text := RemoveBackslashUnlessRoot(StoredData);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  AppDir, DataDir: string;
begin
  Result := True;
  if CurPageID = wpSelectDir then
  begin
    AppDir := EnsureAppInstallDir(WizardForm.DirEdit.Text);
    WizardForm.DirEdit.Text := AppDir;
    if not DirExists(ExtractFileDir(AppDir)) and (ExtractFileDir(AppDir) <> '') then
    begin
      if MsgBox('上级目录不存在，是否继续？', mbConfirmation, MB_YESNO) = IDNO then
      begin
        Result := False;
        Exit;
      end;
    end;
  end
  else if CurPageID = WwSettingsPage.ID then
  begin
    DataDir := NormalizeDataDir(WwDataDirEdit.Text);
    if DataDir = '' then
    begin
      MsgBox('请选择数据目录。', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    DataPath := DataDir;
    LibraryPackSource := ResolveLibraryPackSource(DataPath);
    if (Trim(WwLibraryZipEdit.Text) <> '') and (LibraryPackSource = '') then
    begin
      MsgBox('找不到所填资源包路径，请检查或留空。', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  TargetData, InstalledPack: string;
begin
  if CurStep <> ssPostInstall then
    Exit;

  TargetData := NormalizeDataDir(DataPath);
  if TargetData = '' then
  begin
    if RegDataPath <> '' then
      TargetData := NormalizeDataDir(RegDataPath)
    else if TryReadDataPathFromConfig(TargetData) then
      TargetData := NormalizeDataDir(TargetData)
    else
      TargetData := DefaultDataDir;
  end;

  DataPath := TargetData;
  InstalledPack := '';
  if LibraryPackSource <> '' then
    InstalledPack := InstallLibraryPackToDataDir;

  SaveInstallRegistry;
  WriteWanwuPathConfig(TargetData, InstalledPack);
  if FileExists(TargetData + '\' + CLibraryPackFileName) then
    RunLibraryPackImport(TargetData);
end;

function ShowWwUninstallWelcomeDlg: Boolean;
var
  Res: Integer;
begin
  GKeepUserDataOnUninstall := True;
  Res := MsgBox(
    '卸载万物？' + #13#10#13#10 +
    '是 = 保留个人数据' + #13#10 +
    '否 = 删除全部数据与缓存' + #13#10 +
    '取消 = 中止',
    mbConfirmation, MB_YESNOCANCEL or MB_DEFBUTTON1);
  case Res of
    IDYES:
      begin
        GKeepUserDataOnUninstall := True;
        Result := True;
      end;
    IDNO:
      begin
        GKeepUserDataOnUninstall := False;
        Result := True;
      end;
  else
    Result := False;
  end;
end;

function InitializeUninstall: Boolean;
begin
  Result := ShowWwUninstallWelcomeDlg;
  GUninstallWelcomeConfirmed := Result;
end;

procedure DeleteUserDataAtPath(const P: string);
begin
  if (P <> '') and DirExists(P) then
    DelTree(P, True, True, True);
end;

procedure DeleteAppCacheDir;
var
  InstallPath, CacheDir: string;
begin
  if RegQueryStringValue(HKCU, CRegRoot, 'InstallPath', InstallPath) and (InstallPath <> '') then
  begin
    CacheDir := InstallPath + '\.cache';
    if DirExists(CacheDir) then
      DelTree(CacheDir, True, True, True);
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  StoredData: string;
begin
  if CurUninstallStep = usUninstall then
  begin
    DeleteAppCacheDir;
    Exit;
  end;

  if CurUninstallStep <> usPostUninstall then
    Exit;

  if not GUninstallWelcomeConfirmed then
    GKeepUserDataOnUninstall := True;

  if not GKeepUserDataOnUninstall then
  begin
    StoredData := RegDataPath;
    if (StoredData = '') and not TryReadDataPathFromConfig(StoredData) then
      StoredData := '';
    DeleteUserDataAtPath(StoredData);
    DeleteUserDataAtPath(ElectronConfigDir);
  end;
  RemoveInstallRegistry;
end;
