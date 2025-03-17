@echo off

:: 安装 laf-cli 并添加 LAF 用户
npm install -g laf-cli
laf user add laf -r https://laf.run
echo 请选择您所在的 Sealos 可用区:
echo 1. 新加坡 (https://sealaf-api.cloud.sealos.io)
echo 2. 广州 (https://sealaf-api.gzg.sealos.run) 
echo 3. 杭州 (https://sealaf-api.hzh.sealos.run)
echo 4. 北京 (https://sealaf-api.bja.sealos.run)
set /p sealosRegion="输入对应的数字 (1-4): "

if %sealosRegion% == 1 (
    set sealafUrl=https://sealaf-api.cloud.sealos.io
) else if %sealosRegion% == 2 (
    set sealafUrl=https://sealaf-api.gzg.sealos.run
) else if %sealosRegion% == 3 (
    set sealafUrl=https://sealaf-api.hzh.sealos.run
) else if %sealosRegion% == 4 (
    set sealafUrl=https://sealaf-api.bja.sealos.run
) else (
    echo 输入有误,请重新运行脚本。
    exit /b
)

laf user add sealaf-region -r %sealafUrl%
laf user switch laf
set /p latPAT="请输入 LAT PAT: "
laf login %latPAT%
laf user switch sealaf-region
set /p sealafPAT="请输入 sealaf-region PAT: "
laf login %sealafPAT%

:: 获取用户输入
set /p APPID="请输入 APPID: "
set /p storagePath="请输入存储相对目录: "

:: 创建目录并切换
mkdir %APPID% && cd %APPID% &&mkdir db

:: 拉取云存储、环境变量和依赖
laf user switch
laf app init %APPID%
laf func pull
laf env pull
laf dep pull

:: 列出存储
laf storage list

:: 拉取存储
set /p bucketName="请输入存储桶名称: "
laf storage pull %bucketName% %storagePath%

:: 拉取数据库
laf database export .\db

:: 删除 .app.yaml
del .app.yaml

echo 操作完成!