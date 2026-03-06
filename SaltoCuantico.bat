@echo off
title Salto Cuántico Finanzas
color 0A

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   💰 Salto Cuántico Finanzas         ║
echo  ║   Iniciando dashboard...             ║
echo  ╚══════════════════════════════════════╝
echo.

set PROJECT_DIR=C:\Users\Chelo\Gestor de ingresos

cd /d "%PROJECT_DIR%"

:: Abrir navegador después de 3 segundos
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

echo  ✅ Abriendo en http://localhost:5173
echo  (Cierra esta ventana para detener el servidor)
echo.

npm run dev

pause
