; Leaf installer — per-user install, no admin rights needed.
; Build: makensis -DSRC=<win-unpacked> -DBUILD=<build dir> -DOUT=<setup.exe> -DVERSION=1.0.0 leaf.nsi
Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64
ManifestDPIAware true

!define APP "Leaf"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Leaf"

Name "${APP}"
Caption "Install ${APP}"
UninstallCaption "Uninstall ${APP}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\Leaf"
InstallDirRegKey HKCU "Software\Leaf" "InstallDir"
RequestExecutionLevel user
BrandingText "${APP} ${VERSION}"

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ICON "${BUILD}/icon.ico"
!define MUI_UNICON "${BUILD}/icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${BUILD}/sidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${BUILD}/sidebar.bmp"
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "Stop installing Leaf?"
!define MUI_WELCOMEPAGE_TITLE "Install Leaf"
!define MUI_WELCOMEPAGE_TEXT "Leaf opens PDF and Word files so you can edit them like any document, then save as Word or PDF.$\r$\n$\r$\nIt runs entirely on this computer: no account, no internet connection, and your files stay on your device.$\r$\n$\r$\nClose Leaf if it is open, then click Next."
!define MUI_DIRECTORYPAGE_TEXT_TOP "Leaf will be installed for your user account in this folder. You don't need administrator rights."
!define MUI_FINISHPAGE_TITLE "Leaf is ready"
!define MUI_FINISHPAGE_TEXT "You can open Leaf from the Start menu or the desktop shortcut. To edit a PDF straight away, right-click it and choose Open with, then Leaf."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Leaf.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open Leaf now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductName" "Leaf"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileDescription" "Leaf Setup"
VIAddVersionKey /LANG=${LANG_ENGLISH} "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_ENGLISH} "CompanyName" "Leaf"
VIAddVersionKey /LANG=${LANG_ENGLISH} "LegalCopyright" "Leaf"

Section "Leaf" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"
  ; clean out the previous version's app files before copying the new ones
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  File /r "${SRC}/*.*"
  WriteUninstaller "$INSTDIR\Uninstall Leaf.exe"

  CreateShortCut "$SMPROGRAMS\Leaf.lnk" "$INSTDIR\Leaf.exe" "" "$INSTDIR\Leaf.exe" 0
  CreateShortCut "$DESKTOP\Leaf.lnk" "$INSTDIR\Leaf.exe" "" "$INSTDIR\Leaf.exe" 0

  WriteRegStr HKCU "Software\Leaf" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "Leaf"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "Leaf"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\Leaf.exe,0"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall Leaf.exe"'
  WriteRegStr HKCU "${UNKEY}" "QuietUninstallString" '"$INSTDIR\Uninstall Leaf.exe" /S'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" "$0"

  ; "Open with" for PDF and Word files (does not change the default app)
  WriteRegStr HKCU "Software\Classes\Leaf.Document" "" "Document"
  WriteRegStr HKCU "Software\Classes\Leaf.Document\DefaultIcon" "" "$INSTDIR\Leaf.exe,0"
  WriteRegStr HKCU "Software\Classes\Leaf.Document\shell\open\command" "" '"$INSTDIR\Leaf.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\.pdf\OpenWithProgids" "Leaf.Document" ""
  WriteRegStr HKCU "Software\Classes\.docx\OpenWithProgids" "Leaf.Document" ""
  WriteRegStr HKCU "Software\Classes\Applications\Leaf.exe" "FriendlyAppName" "Leaf"
  WriteRegStr HKCU "Software\Classes\Applications\Leaf.exe\shell\open\command" "" '"$INSTDIR\Leaf.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\Applications\Leaf.exe\SupportedTypes" ".pdf" ""
  WriteRegStr HKCU "Software\Classes\Applications\Leaf.exe\SupportedTypes" ".docx" ""
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
SectionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\Leaf.lnk"
  Delete "$DESKTOP\Leaf.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegKey HKCU "Software\Leaf"
  DeleteRegKey HKCU "Software\Classes\Leaf.Document"
  DeleteRegValue HKCU "Software\Classes\.pdf\OpenWithProgids" "Leaf.Document"
  DeleteRegValue HKCU "Software\Classes\.docx\OpenWithProgids" "Leaf.Document"
  DeleteRegKey HKCU "Software\Classes\Applications\Leaf.exe"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
SectionEnd
