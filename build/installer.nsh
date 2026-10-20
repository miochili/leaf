; Adds Leaf to "Open with" for PDF and Word files without taking over the default app.
!macro customInstall
  WriteRegStr HKCU "Software\Classes\Leaf.Document" "" "Document"
  WriteRegStr HKCU "Software\Classes\Leaf.Document\DefaultIcon" "" "$INSTDIR\Leaf.exe,0"
  WriteRegStr HKCU "Software\Classes\Leaf.Document\shell\open\command" "" '"$INSTDIR\Leaf.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\.pdf\OpenWithProgids" "Leaf.Document" ""
  WriteRegStr HKCU "Software\Classes\.docx\OpenWithProgids" "Leaf.Document" ""
  WriteRegStr HKCU "Software\Classes\Applications\Leaf.exe" "FriendlyAppName" "Leaf"
  WriteRegStr HKCU "Software\Classes\Applications\Leaf.exe\shell\open\command" "" '"$INSTDIR\Leaf.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\Applications\Leaf.exe\SupportedTypes" ".pdf" ""
  WriteRegStr HKCU "Software\Classes\Applications\Leaf.exe\SupportedTypes" ".docx" ""
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Leaf.Document"
  DeleteRegValue HKCU "Software\Classes\.pdf\OpenWithProgids" "Leaf.Document"
  DeleteRegValue HKCU "Software\Classes\.docx\OpenWithProgids" "Leaf.Document"
  DeleteRegKey HKCU "Software\Classes\Applications\Leaf.exe"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
