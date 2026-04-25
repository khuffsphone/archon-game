Add-Type -AssemblyName System.Drawing
$src = 'C:\Dev\archon-game\electron\icon.png'
$dst = 'C:\Dev\archon-game\electron\icon.ico'
$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, 0, 0, 256, 256)
$g.Dispose()
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.FileStream]::new($dst, 'Create')
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "ICO saved to $dst"
