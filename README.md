# Tropo-Focus-Monitor-plugin
Plugin for FM-DX-WEBSERVER which monitors the status of improved tropo conditions with azimuth pointing based on realtime data from https://vhf.dxview.org/ 
<img width="371" height="633" alt="34398" src="https://github.com/user-attachments/assets/9c2704bc-c784-4a3d-b449-8d7fa279691b" />

CURRENT RELEASE V1.0a (1.2.2026)

SETTINGS COULD BE ADJUSTED IN "Tropo" FOLDER

    const GOLD = '#dba642'; // COLOR
    const MY_LAT = 49.12; // COORDINATIONS LAT
    const MY_LON = 16.19; // COORDINATIONS LON
    const CACHE_KEY = 'tropo_data_cache';
    let minPathLength = 200;

DON'T FORGET TO CHANGE YOUR PATH URL! (DEPEND ON YOUR REGION)

    const rawUrl = 'https://vhf.dxview.org/text_display?reg=Europe&dist=150'

URL CAN BE ACQUIRED HERE:
https://vhf.dxview.org/text_display
1. Click on see more paths
2. Select your region
3. Copy url to your plugin settings

ENJOY.
