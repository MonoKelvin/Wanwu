[Code]
const
  CAppFolderName = 'Wanwu';
  CDataFolderName = 'wanwu';
  CRegRoot = 'Software\MonoStudio\Wanwu';
  CLibraryPackFileName = 'library-data-pack.zip';

var
  WwSettingsPage: TWizardPage;
  WwDataParentEdit: TNewEdit;
  WwLibraryZipEdit: TNewEdit;
  DataPath: string;
  LibraryPackSource: string;
  GKeepUserDataOnUninstall: Boolean;
  UninstallWelcomePage: TNewNotebookPage;
  UninstallKeepDataCheck: TNewCheckBox;

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

function EnsureDataPath(const Parent: string): string;
var
  P: string;
begin
  P := RemoveBackslashUnlessRoot(Parent);
  if CompareText(ExtractFileName(P), CDataFolderName) = 0 then
    Result := P
  else
    Result := P + '\' + CDataFolderName;
end;

function ElectronConfigDir: string;
begin
  Result := ExpandConstant('{userappdata}\wanwu');
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

procedure WwBrowseDataParentClick(Sender: TObject);
var
  Dir: string;
begin
  Dir := WwDataParentEdit.Text;
  if BrowseForFolder('选择设置目录', Dir, True) then
    WwDataParentEdit.Text := Dir;
end;

function ResolveLibraryPackSource(const ParentDir, WanwuDir: string): string;
var
  InWanwu, InParent: string;
begin
  Result := Trim(WwLibraryZipEdit.Text);
  if (Result <> '') and FileExists(Result) then
    Exit;
  Result := '';
  InWanwu := WanwuDir + '\' + CLibraryPackFileName;
  InParent := RemoveBackslashUnlessRoot(ParentDir) + '\' + CLibraryPackFileName;
  if FileExists(InWanwu) then
    Result := InWanwu
  else if FileExists(InParent) then
    Result := InParent;
end;

procedure CreateWwWizardPages;
var
  Top, RowH, Gap, W, BtnW: Integer;
  HintLabel, LblData, LblPack, NoteLabel: TNewStaticText;
  BtnData: TNewButton;
begin
  WwSettingsPage := CreateCustomPage(
    wpSelectDir,
    '数据与图鉴',
    '个人数据与图鉴资源使用同一设置位置'
  );

  Top := ScaleY(8);
  Gap := ScaleY(10);
  RowH := ScaleY(23);
  BtnW := ScaleX(72);
  W := WwSettingsPage.SurfaceWidth - ScaleX(32);

  HintLabel := TNewStaticText.Create(WwSettingsPage);
  HintLabel.Parent := WwSettingsPage.Surface;
  HintLabel.Left := ScaleX(0);
  HintLabel.Top := Top;
  HintLabel.Width := W;
  HintLabel.AutoSize := False;
  HintLabel.WordWrap := True;
  HintLabel.Caption :=
    '数据（收藏、订阅等）与图鉴包均放在下方目录；将自动创建「' + CDataFolderName + '」子目录。' + #13#10 +
    '图鉴包下载：{#GitHubReleasesURL}';
  Top := Top + ScaleY(52);

  LblData := TNewStaticText.Create(WwSettingsPage);
  LblData.Parent := WwSettingsPage.Surface;
  LblData.Left := ScaleX(0);
  LblData.Top := Top;
  LblData.Caption := '设置目录：';
  Top := Top + Gap;

  WwDataParentEdit := TNewEdit.Create(WwSettingsPage);
  WwDataParentEdit.Parent := WwSettingsPage.Surface;
  WwDataParentEdit.Left := ScaleX(0);
  WwDataParentEdit.Top := Top;
  WwDataParentEdit.Width := W - BtnW - ScaleX(8);
  WwDataParentEdit.Height := RowH;
  WwDataParentEdit.Text := ElectronConfigDir;

  BtnData := TNewButton.Create(WwSettingsPage);
  BtnData.Parent := WwSettingsPage.Surface;
  BtnData.Left := WwDataParentEdit.Left + WwDataParentEdit.Width + ScaleX(8);
  BtnData.Top := Top;
  BtnData.Width := BtnW;
  BtnData.Height := RowH;
  BtnData.Caption := '浏览…';
  BtnData.OnClick := @WwBrowseDataParentClick;
  Top := Top + RowH + Gap;

  LblPack := TNewStaticText.Create(WwSettingsPage);
  LblPack.Parent := WwSettingsPage.Surface;
  LblPack.Left := ScaleX(0);
  LblPack.Top := Top;
  LblPack.Caption := '图鉴包 zip（可选，可填完整路径）：';
  Top := Top + Gap;

  WwLibraryZipEdit := TNewEdit.Create(WwSettingsPage);
  WwLibraryZipEdit.Parent := WwSettingsPage.Surface;
  WwLibraryZipEdit.Left := ScaleX(0);
  WwLibraryZipEdit.Top := Top;
  WwLibraryZipEdit.Width := W;
  WwLibraryZipEdit.Height := RowH;
  Top := Top + RowH + Gap;

  NoteLabel := TNewStaticText.Create(WwSettingsPage);
  NoteLabel.Parent := WwSettingsPage.Surface;
  NoteLabel.Left := ScaleX(0);
  NoteLabel.Top := Top;
  NoteLabel.Width := W;
  NoteLabel.AutoSize := False;
  NoteLabel.WordWrap := True;
  NoteLabel.Font.Style := [fsItalic];
  NoteLabel.Caption :=
    '留空时将在设置目录或 wanwu 子目录查找 ' + CLibraryPackFileName + '；' +
    '也可将 zip 放到程序安装目录，由应用首次启动时导入。';
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

procedure InitDataDirectoryLayout(const RootPath: string);
begin
  ForceDirectories(RootPath + '\db');
  ForceDirectories(RootPath + '\media');
  ForceDirectories(RootPath + '\cache');
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
  Dest := DataPath + '\' + CLibraryPackFileName;
  if CopyFile(LibraryPackSource, Dest, False) then
    Result := Dest;
end;

function InitializeSetup: Boolean;
begin
  DataPath := '';
  LibraryPackSource := '';
  Result := True;
end;

procedure InitializeWizard;
var
  InstallDir, StoredData, ParentDir: string;
begin
  CreateWwWizardPages;

  if RegQueryStringValue(HKCU, CRegRoot, 'InstallPath', InstallDir) and (InstallDir <> '') then
    WizardForm.DirEdit.Text := InstallDir;

  StoredData := RegDataPath;
  if (StoredData = '') then
    TryReadDataPathFromConfig(StoredData);
  if StoredData <> '' then
  begin
    ParentDir := ExtractFileDir(RemoveBackslashUnlessRoot(StoredData));
    if ParentDir <> '' then
      WwDataParentEdit.Text := ParentDir;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  AppDir, ParentDir, PackFile: string;
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
    ParentDir := Trim(WwDataParentEdit.Text);
    if ParentDir = '' then
    begin
      MsgBox('请选择设置目录。', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    DataPath := EnsureDataPath(ParentDir);
    LibraryPackSource := ResolveLibraryPackSource(ParentDir, DataPath);
    if (Trim(WwLibraryZipEdit.Text) <> '') and (LibraryPackSource = '') then
    begin
      MsgBox('找不到所填图鉴包路径，请检查或留空。', mbError, MB_OK);
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

  TargetData := DataPath;
  if HasPreviousInstallRegistry then
  begin
    if (TargetData = '') then
    begin
      TargetData := RegDataPath;
      if (TargetData = '') and not TryReadDataPathFromConfig(TargetData) then
        TargetData := EnsureDataPath(ElectronConfigDir);
    end;
  end;

  InitDataDirectoryLayout(TargetData);
  InstalledPack := '';
  if LibraryPackSource <> '' then
  begin
    DataPath := TargetData;
    InstalledPack := InstallLibraryPackToDataDir;
  end;
  DataPath := TargetData;
  SaveInstallRegistry;
  WriteWanwuPathConfig(TargetData, InstalledPack);
end;

function ConfirmDeleteUserData: Boolean;
begin
  Result := MsgBox(
    '将删除收藏、订阅等全部个人数据，且无法恢复。' + #13#10 +
    '建议先在应用内备份。' + #13#10#13#10 +
    '确定删除？',
    mbConfirmation, MB_YESNO) = IDYES;
end;

procedure UninstallKeepDataCheckClick(Sender: TObject);
begin
  if UninstallKeepDataCheck.Checked then
    Exit;
  if not ConfirmDeleteUserData then
    UninstallKeepDataCheck.Checked := True;
end;

procedure InitializeUninstallProgressForm;
var
  InfoLabel: TNewStaticText;
  NoteLabel: TNewStaticText;
begin
  GKeepUserDataOnUninstall := True;

  UninstallWelcomePage := TNewNotebookPage.Create(UninstallProgressForm);
  UninstallWelcomePage.Notebook := UninstallProgressForm.OuterNotebook;
  UninstallWelcomePage.Parent := UninstallProgressForm.OuterNotebook;
  UninstallWelcomePage.Align := alClient;

  InfoLabel := TNewStaticText.Create(UninstallWelcomePage);
  InfoLabel.Parent := UninstallWelcomePage;
  InfoLabel.Left := ScaleX(16);
  InfoLabel.Top := ScaleY(16);
  InfoLabel.Width := UninstallWelcomePage.Width - ScaleX(32);
  InfoLabel.AutoSize := False;
  InfoLabel.WordWrap := True;
  InfoLabel.Caption := '即将卸载万物。程序文件将被删除。';

  UninstallKeepDataCheck := TNewCheckBox.Create(UninstallWelcomePage);
  UninstallKeepDataCheck.Parent := UninstallWelcomePage;
  UninstallKeepDataCheck.Left := ScaleX(16);
  UninstallKeepDataCheck.Top := InfoLabel.Top + ScaleY(48);
  UninstallKeepDataCheck.Width := UninstallWelcomePage.Width - ScaleX(32);
  UninstallKeepDataCheck.Caption := '保留我的数据（推荐）';
  UninstallKeepDataCheck.Checked := True;
  UninstallKeepDataCheck.OnClick := @UninstallKeepDataCheckClick;

  NoteLabel := TNewStaticText.Create(UninstallWelcomePage);
  NoteLabel.Parent := UninstallWelcomePage;
  NoteLabel.Left := ScaleX(16);
  NoteLabel.Top := UninstallKeepDataCheck.Top + ScaleY(36);
  NoteLabel.Width := UninstallWelcomePage.Width - ScaleX(32);
  NoteLabel.AutoSize := False;
  NoteLabel.WordWrap := True;
  NoteLabel.Font.Style := [fsItalic];
  NoteLabel.Caption :=
    '若曾改过数据保存位置，该文件夹需自行处理。';

  UninstallProgressForm.OuterNotebook.ActivePage := UninstallWelcomePage;
  UninstallProgressForm.PageNameLabel.Caption := '卸载';
  UninstallProgressForm.PageDescriptionLabel.Caption := '是否保留个人数据';
end;

procedure DeleteUserDataAtPath(const P: string);
begin
  if (P <> '') and DirExists(P) then
    DelTree(P, True, True, True);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  StoredData, ConfigFile: string;
begin
  if CurUninstallStep <> usUninstall then
    Exit;

  if Assigned(UninstallKeepDataCheck) then
    GKeepUserDataOnUninstall := UninstallKeepDataCheck.Checked
  else
    GKeepUserDataOnUninstall := True;

  if not GKeepUserDataOnUninstall then
  begin
    StoredData := RegDataPath;
    if (StoredData = '') and not TryReadDataPathFromConfig(StoredData) then
      StoredData := '';
    DeleteUserDataAtPath(StoredData);
    ConfigFile := WanwuPathConfigFile;
    if FileExists(ConfigFile) then
      DeleteFile(ConfigFile);
  end;
  RemoveInstallRegistry;
end;
