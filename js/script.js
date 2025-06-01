
var map = L.map('map', { center: [-2.5, 118], zoom: 5, attributionControl: false });
        L.control.attribution({ position: 'bottomright' }).addAttribution('Proposed by <a href="https://mail.google.com/mail/?view=cm&fs=1&to=prayoga.ismail@bmkg.go.id" target="_blank">Prayoga Ismail</a>').addTo(map);
        document.getElementById("legend").style.display = "none";
document.getElementById("webmap-title").addEventListener("click", function() {
    location.reload(); });
// Bagian ini utk fungsi cropping layar

const startCropButton = document.getElementById('start-crop-button');
const cropOverlay = document.getElementById('crop-overlay');
const cropCanvasContainer = document.getElementById('crop-canvas-container');
const cropCanvas = document.getElementById('crop-canvas');
const cropImageButton = document.getElementById('crop-image-button');
const resetPolygonButton = document.getElementById('reset-polygon-button'); // Ganti nama jadi resetShapeButton
const cancelCropButton = document.getElementById('cancel-crop-button');
const cropShapeSelector = document.getElementById('crop-shape-selector');
const cropInstructions = document.getElementById('crop-instructions');
const ctx = cropCanvas.getContext('2d');

let isCropping = false;
let currentCropShape = 'polygon'; // 'polygon', 'rectangle', 'circle'
let shapePoints = []; // Untuk poligon dan persegi (2 titik: start, end)
let circleParams = null; // { x, y, radius } untuk lingkaran
let originalImage = null;
let isDrawingShape = false; // Flag untuk menandakan sedang drag (persegi/lingkaran)
let startDragPoint = null;

// Ganti nama tombol reset
resetPolygonButton.id = 'reset-shape-button';
resetPolygonButton.textContent = 'Reset Bentuk';
const resetShapeButton = document.getElementById('reset-shape-button');


// --- Event Listener untuk Pemilihan Bentuk ---
cropShapeSelector.addEventListener('click', (e) => {
    if (e.target.classList.contains('shape-btn')) {
        document.querySelectorAll('.shape-btn.active').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentCropShape = e.target.dataset.shape;
        resetCurrentShape(); // Reset bentuk saat ganti mode
        updateInstructions();
    }
});

function updateInstructions() {
    if (currentCropShape === 'polygon') {
        cropInstructions.textContent = 'Poligon: Klik untuk titik. Klik titik awal untuk menutup. Kanan untuk hapus.';
    } else if (currentCropShape === 'rectangle') {
        cropInstructions.textContent = 'Persegi: Klik dan seret untuk menggambar persegi.';
    } else if (currentCropShape === 'circle') {
        cropInstructions.textContent = 'Lingkaran: Klik dan seret dari pusat ke tepi lingkaran.';
    }
}


startCropButton.addEventListener('click', async () => {
    // ... (kode screenshot html2canvas Anda tetap sama) ...
    const leafletControls = document.querySelectorAll('.leaflet-control-container, .leaflet-control, #layerSelector, #webmap-title, #time-indicator, .search-toggle, .search-box, #legend, #irSatelliteLegend, #wvSatelliteLegend, #precip-owm, #pressure-owm, #topo-legend, #lulc-legend, #legend-sigmet, #wind-controls, #controls, #start-crop-button, #crop-shape-selector');
    leafletControls.forEach(el => el.style.visibility = 'hidden');
    document.getElementById('map').style.cursor = 'wait';

    try {
        const mapElement = document.getElementById('map');
        window.scrollTo(0,0);
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            logging: false, // Ubah ke true untuk debug
        });

        originalImage = new Image();
        originalImage.onload = () => {
            const maxOverlayWidth = window.innerWidth * 0.9;
            const maxOverlayHeight = window.innerHeight * 0.8;
            let displayWidth = originalImage.width;
            let displayHeight = originalImage.height;

            if (displayWidth > maxOverlayWidth) { /* ... (logika resize Anda tetap sama) ... */ }
            if (displayHeight > maxOverlayHeight) { /* ... (logika resize Anda tetap sama) ... */ }
             if (displayWidth > maxOverlayWidth) {
                const ratio = maxOverlayWidth / displayWidth;
                displayWidth = maxOverlayWidth;
                displayHeight *= ratio;
            }
            if (displayHeight > maxOverlayHeight) {
                const ratio = maxOverlayHeight / displayHeight;
                displayHeight = maxOverlayHeight;
                displayWidth *= ratio;
            }


            cropCanvas.width = displayWidth;
            cropCanvas.height = displayHeight;
            cropCanvasContainer.style.width = displayWidth + 'px';
            cropCanvasContainer.style.height = displayHeight + 'px';

            ctx.drawImage(originalImage, 0, 0, cropCanvas.width, cropCanvas.height);
            resetCurrentShape();
            cropOverlay.style.display = 'flex';
            isCropping = true;
            updateInstructions(); // Tampilkan instruksi yang benar
        };
        originalImage.onerror = (e) => {
            console.error("Gagal memuat screenshot ke Image object:", e);
            alert("Gagal memproses screenshot. Mungkin ada masalah dengan CORS atau konten eksternal.");
        };
        originalImage.src = canvas.toDataURL('image/png');

    } catch (error) {
        console.error('Error mengambil screenshot:', error);
        alert('Gagal mengambil screenshot peta.');
    } finally {
        leafletControls.forEach(el => el.style.visibility = 'visible');
        document.getElementById('map').style.cursor = '';
    }
});

// --- Logika Menggambar Bentuk ---
cropCanvas.addEventListener('mousedown', (event) => {
    if (!isCropping || !originalImage) return;
    if (event.button !== 0) return; // Hanya untuk klik kiri

    const rect = cropCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (currentCropShape === 'rectangle' || currentCropShape === 'circle') {
        isDrawingShape = true;
        startDragPoint = { x, y };
        if (currentCropShape === 'rectangle') {
            shapePoints = [startDragPoint, startDragPoint]; // Mulai dengan titik yang sama
        } else { // circle
            circleParams = { cx: x, cy: y, radius: 0 };
        }
    }
});

cropCanvas.addEventListener('mousemove', (event) => {
    if (!isCropping || !isDrawingShape || !originalImage || !startDragPoint) return;

    const rect = cropCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (currentCropShape === 'rectangle') {
        shapePoints[1] = { x, y };
    } else if (currentCropShape === 'circle') {
        const dx = x - startDragPoint.x;
        const dy = y - startDragPoint.y;
        circleParams.radius = Math.sqrt(dx * dx + dy * dy);
    }
    drawCurrentShape();
});

cropCanvas.addEventListener('mouseup', (event) => {
    if (!isCropping || !originalImage) return;
    if (event.button !== 0) return;

    isDrawingShape = false;
    startDragPoint = null;

    // Untuk rectangle, shapePoints sudah diupdate di mousemove.
    // Untuk circle, circleParams sudah diupdate.
    // Untuk polygon, ini tidak relevan, karena penambahan titik ada di 'click'.
    if (currentCropShape === 'rectangle' || currentCropShape === 'circle') {
        drawCurrentShape(); // Gambar final setelah mouseup
    }
});


cropCanvas.addEventListener('click', (event) => {
    if (!isCropping || !originalImage || isDrawingShape) return; // Jangan proses jika sedang drag
    if (event.button !== 0) return;

    if (currentCropShape === 'polygon') {
        const rect = cropCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (shapePoints.length > 2) {
            const firstPoint = shapePoints[0];
            const distanceToFirst = Math.sqrt(Math.pow(firstPoint.x - x, 2) + Math.pow(firstPoint.y - y, 2));
            if (distanceToFirst < 10) {
                shapePoints.push({ ...firstPoint });
                drawCurrentShape();
                return;
            }
        }
        shapePoints.push({ x, y });
        drawCurrentShape();
    }
});

cropCanvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (!isCropping || isDrawingShape) return;

    if (currentCropShape === 'polygon' && shapePoints.length > 0) {
        if (shapePoints.length <= 1 ||
            (shapePoints[shapePoints.length - 1].x !== shapePoints[0].x ||
             shapePoints[shapePoints.length - 1].y !== shapePoints[0].y)) {
            shapePoints.pop();
        }
        drawCurrentShape();
    }
});

function resetCurrentShape() {
    shapePoints = [];
    circleParams = null;
    isDrawingShape = false;
    startDragPoint = null;
    if (originalImage) { // Hanya gambar ulang jika gambar sudah ada
       drawCurrentShape();
    }
}

function drawCurrentShape() {
    if (!originalImage) return;
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    ctx.drawImage(originalImage, 0, 0, cropCanvas.width, cropCanvas.height);

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

    if (currentCropShape === 'polygon' && shapePoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(shapePoints[0].x, shapePoints[0].y);
        for (let i = 1; i < shapePoints.length; i++) {
            ctx.lineTo(shapePoints[i].x, shapePoints[i].y);
        }
        if (shapePoints.length > 2 && shapePoints[shapePoints.length - 1].x === shapePoints[0].x && shapePoints[shapePoints.length - 1].y === shapePoints[0].y) {
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
            ctx.lineWidth = 3;
        }
        ctx.stroke();
        ctx.fillStyle = 'red';
        shapePoints.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    } else if (currentCropShape === 'rectangle' && shapePoints.length === 2) {
        const start = shapePoints[0];
        const end = shapePoints[1];
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.beginPath();
        ctx.rect(start.x, start.y, width, height);
        if (isDrawingShape) { // Hanya preview garis saat menggambar
             ctx.stroke();
        } else if (width !== 0 || height !== 0) { // Isi dan pertebal jika sudah selesai dan valid
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

    } else if (currentCropShape === 'circle' && circleParams && circleParams.radius > 0) {
        ctx.beginPath();
        ctx.arc(circleParams.cx, circleParams.cy, circleParams.radius, 0, 2 * Math.PI);
        if (isDrawingShape) {
             ctx.stroke();
        } else {
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
}

resetShapeButton.addEventListener('click', resetCurrentShape);

cancelCropButton.addEventListener('click', () => {
    cropOverlay.style.display = 'none';
    isCropping = false;
    resetCurrentShape();
    originalImage = null;
    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
});


// --- Logika Cropping ---
cropImageButton.addEventListener('click', () => {
    if (!isCropping || !originalImage) {
        alert('Ambil screenshot terlebih dahulu.');
        return;
    }

    const scaleX = originalImage.width / cropCanvas.width;
    const scaleY = originalImage.height / cropCanvas.height;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validShape = false;

    tempCtx.beginPath(); // Mulai path untuk clipping

    if (currentCropShape === 'polygon') {
        if (shapePoints.length < 3 || !(shapePoints[shapePoints.length - 1].x === shapePoints[0].x && shapePoints[shapePoints.length - 1].y === shapePoints[0].y)) {
            alert('Poligon belum lengkap atau belum ditutup.');
            return;
        }
        tempCtx.moveTo(shapePoints[0].x * scaleX, shapePoints[0].y * scaleY);
        shapePoints.forEach((p, index) => {
            if (index > 0) tempCtx.lineTo(p.x * scaleX, p.y * scaleY);
            minX = Math.min(minX, p.x * scaleX);
            minY = Math.min(minY, p.y * scaleY);
            maxX = Math.max(maxX, p.x * scaleX);
            maxY = Math.max(maxY, p.y * scaleY);
        });
        tempCtx.closePath();
        validShape = true;
    } else if (currentCropShape === 'rectangle' && shapePoints.length === 2) {
        const start = { x: shapePoints[0].x * scaleX, y: shapePoints[0].y * scaleY };
        const end = { x: shapePoints[1].x * scaleX, y: shapePoints[1].y * scaleY };
        minX = Math.min(start.x, end.x);
        minY = Math.min(start.y, end.y);
        maxX = Math.max(start.x, end.x);
        maxY = Math.max(start.y, end.y);
        if (maxX - minX <=0 || maxY - minY <=0) {
            alert("Ukuran persegi tidak valid."); return;
        }
        tempCtx.rect(minX, minY, maxX - minX, maxY - minY);
        validShape = true;
    } else if (currentCropShape === 'circle' && circleParams && circleParams.radius > 0) {
        const scaledCx = circleParams.cx * scaleX;
        const scaledCy = circleParams.cy * scaleY;
        const scaledRadius = circleParams.radius * Math.min(scaleX, scaleY); // Gunakan skala terkecil agar tidak distorsi
        if (scaledRadius <=0) {
            alert("Radius lingkaran tidak valid."); return;
        }
        tempCtx.arc(scaledCx, scaledCy, scaledRadius, 0, 2 * Math.PI);
        minX = scaledCx - scaledRadius;
        minY = scaledCy - scaledRadius;
        maxX = scaledCx + scaledRadius;
        maxY = scaledCy + scaledRadius;
        validShape = true;
    }

    if (!validShape) {
        alert('Bentuk crop belum digambar atau tidak valid.');
        return;
    }

    tempCtx.clip();
    tempCtx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height);

    const cropWidth = Math.round(maxX - minX);
    const cropHeight = Math.round(maxY - minY);

    if (cropWidth <= 0 || cropHeight <= 0) {
        alert("Area crop menghasilkan ukuran gambar yang tidak valid.");
        return;
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = cropWidth;
    finalCanvas.height = cropHeight;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx.drawImage(tempCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    const dataURL = finalCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `idwm_cropped_${currentCropShape}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    cancelCropButton.click();
});
        map.on("overlayadd", function (eventLayer) {
            if (eventLayer.name === "Radar Cuaca") document.getElementById("legend").style.display = "block";
        });
        map.on("overlayremove", function (eventLayer) {
            if (eventLayer.name === "Radar Cuaca") document.getElementById("legend").style.display = "none";
        });
	map.on("overlayadd", function (eventLayer) {
            if (eventLayer.name === "Satelit Inframerah") document.getElementById("irSatelliteLegend").style.display = "block";
        });
        map.on("overlayremove", function (eventLayer) {
            if (eventLayer.name === "Satelit Inframerah") document.getElementById("irSatelliteLegend").style.display = "none";
        });
	map.on("overlayadd", function (eventLayer) {
            if (eventLayer.name === "Satelit Uap Air") document.getElementById("wvSatelliteLegend").style.display = "block";
        });
        map.on("overlayremove", function (eventLayer) {
            if (eventLayer.name === "Satelit Uap Air") document.getElementById("wvSatelliteLegend").style.display = "none";
        });
        map.on("overlayadd", function (eventLayer) {
            if (eventLayer.name === "Sebaran hujan (OWM)") document.getElementById("precip-owm").style.display = "block";
        });
        map.on("overlayremove", function (eventLayer) {
            if (eventLayer.name === "Sebaran hujan (OWM)") document.getElementById("precip-owm").style.display = "none";
        });
        map.on("overlayadd", function (eventLayer) {
            if (eventLayer.name === "Tekanan Udara (OWM)") document.getElementById("pressure-owm").style.display = "block";
        });
        map.on("overlayremove", function (eventLayer) {
            if (eventLayer.name === "Tekanan Udara (OWM)") document.getElementById("pressure-owm").style.display = "none";
        });
        map.on("baselayerchange", function (eventLayer) {
            if (eventLayer.name === "Peta Topografi") document.getElementById("topo-legend").style.display = "block";
            else document.getElementById("topo-legend").style.display = "none";
            if (eventLayer.name === "Peta Tutupan Lahan") document.getElementById("lulc-legend").style.display = "block";
            else document.getElementById("lulc-legend").style.display = "none";
        });
        var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'Base map &copy; OpenStreetMap contributors' }).addTo(map);
        var esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:  'Base map &copy; Esri, DigitalGlobe, GeoEye, Earthstar Geographics' });
        var cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'Base map &copy; CartoDB' });
        var topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'Base map &copy; <a href="https://opentopomap.org/">OpenTopoMap</a> contributors' });
        var lulcMap = L.tileLayer.wms("/api/lulc-wms", {layers: 'WORLDCOVER_2021_MAP', format: 'image/png', transparent: true, attribution: 'Base map &copy; ESA WorldCover 2021' });
        var radarLayer = L.tileLayer('', { opacity: 0.8, attribution: 'Radar data &copy; RainViewer' }); 
        var IRsatelliteLayer = L.tileLayer('', { opacity: 0.9, attribution: 'Satellite data &copy; Accuweather' }); 
	var WVsatelliteLayer = L.tileLayer('', { opacity: 0.6, attribution: 'Satellite data &copy; Accuweather' });
        var imageUrl = 'https://satelit.bmkg.go.id/IMAGE/HIMA/H08_RD_Indonesia.png';
        // Batas wilayah gambar satelit yang telah disesuaikan
        var imageBounds = [[-15, 90], [15, 150]];
        var VSsatelliteLayer = L.imageOverlay(imageUrl, imageBounds, { opacity: 0.7, attribution: 'Satellite data &copy; BMKG'});
	var olrUrl = "https://ncics.org/pub/mjo/v2/map/olr.cfs.all.indonesia.1.png";
	var zonalWindUrl = "https://ncics.org/pub/mjo/v2/map/uwnd850.cfs.all.indonesia.1.png";
	var TropicalLayer= L.layerGroup().addLayer(L.tileLayer("",{attribution:"Tropical waves data &copy NCICS</a>"}) );
var popup = L.popup({className: 'popup-tropical', maxWidth: 420});
function showPopup(imageUrl) {
    popup.setLatLng([-6.5, 120]).setContent('<b>NCICS Tropical Waves</b><br><img id="popup-img" src="' + imageUrl + '" alt="NCICS Image" onclick="openFullscreen(this.src)"><div class="popup-buttons"><button onclick="switchImage(\'olr\')">OLR</button><button onclick="switchImage(\'wind\')">Angin Zonal</button></div>').openOn(map);}
function switchImage(type) {
    var imgElement = document.getElementById("popup-img");
    if (type === 'olr') {
        imgElement.src = olrUrl;} 
    else {imgElement.src = zonalWindUrl;} }
function openFullscreen(src) {
    var fullscreenDiv = document.createElement("div");
    fullscreenDiv.classList.add("fullscreen-img");
    fullscreenDiv.innerHTML = '<button class="close-btn" onclick="closeFullscreen()">TUTUP</button><img src="' + src + '" alt="Fullscreen Image">';
    document.body.appendChild(fullscreenDiv);}
function closeFullscreen() {
    document.querySelector(".fullscreen-img").remove();}
map.on('overlayadd', function(eventLayer) {
    if (eventLayer.layer === TropicalLayer) {
        showPopup(zonalWindUrl);} });
map.on('overlayremove', function(eventLayer) {
    if (eventLayer.layer === TropicalLayer) {
        map.closePopup();} });
        var precipitationLayer = L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=62ac6e2d12bbaaa3de6bf9f57fe1cc00', { attribution: 'Precipitation data &copy; OpenWeatherMap', opacity: 1 });
        var pressureLayer = L.tileLayer('https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=62ac6e2d12bbaaa3de6bf9f57fe1cc00', { attribution: 'Pressure data &copy; OpenWeatherMap', opacity: 1 });
        function addUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                let userLat = position.coords.latitude;
                let userLng = position.coords.longitude;

                // Atur tampilan peta ke lokasi pengguna
                map.setView([userLat, userLng], 8);

                // Tambahkan penanda lokasi pengguna dan simpan ke variabel
                let userMarker = L.marker([userLat, userLng])
                    .addTo(map)
                    .bindPopup("Lokasi Anda Saat Ini")
                    .openPopup();

                // Hapus marker saat popup ditutup
                userMarker.on("popupclose", function () {
                    map.removeLayer(userMarker);
                });
            },
            function (error) {
                console.error("Gagal mendapatkan lokasi:", error.message);
                alert("Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.");
            }
        );
    } else {
        alert("Geolocation tidak didukung di browser ini.");
    }
}
addUserLocation();
        var style = document.createElement('style');
        style.innerHTML = `.leaflet-control-layers label { font-size: 10px; color: #333; }`;
        document.head.appendChild(style);
        setTimeout(() => {
            document.querySelectorAll('.leaflet-control-layers label').forEach(label => {
                label.style.fontSize = "10px";
                label.style.color = "#333";
            });
        }, 500);
        function preloadImage(url, callback) {
            let img = new Image();
            img.onload = callback;
            img.src = url;
        }
        function updateRadar(timeOffset = 0) {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(response => response.json())
        .then(data => {
            if (data.radar && data.radar.past.length > 0) {
                let index = Math.max(0, data.radar.past.length - 1 - timeOffset);
                let timestamp = data.radar.past[index].time;
                let radarUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/8/1_1.png`;
                radarLayer.setUrl(radarUrl);

                // Buat objek Date dari timestamp
                let utcTime = new Date(timestamp * 1000);

                // Konversi ke waktu lokal
                let localTime = new Date(utcTime);
                let localTimeString = localTime.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    });

                // Format bulan dalam bahasa Indonesia
                let bulanIndonesia = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                let bulan = bulanIndonesia[utcTime.getUTCMonth()];

                // Tampilkan waktu UTC dan waktu lokal
                document.getElementById('time-indicator').innerHTML = `
                    <strong>${utcTime.getUTCDate()} ${bulan} ${utcTime.getUTCFullYear()}</strong><br>
                    <span style="color: #FFD700;">${utcTime.getUTCHours().toString().padStart(2, '0')}:${utcTime.getUTCMinutes().toString().padStart(2, '0')} UTC</span><br>
                    <span style="color: #00FF00;">${localTimeString} Waktu Setempat</span>
                `;
            } else {
                console.error("Data radar tidak tersedia.");
            }
        })
        .catch(error => console.error("Gagal mengambil data radar:", error));}
        // --- Konfigurasi Umum AccuWeather ---
const ACCUWEATHER_API_KEY = 'de13920f574d420984d3080b1fa6132b'; // GANTI DENGAN API KEY ANDA YANG VALID!
const TIME_INTERVAL_MINUTES = 10; // Asumsi update citra setiap 10 menit

// --- Konfigurasi Satellite IR AccuWeather ---
const ACCUWEATHER_IR_API_BASE_URL = 'https://api.accuweather.com/maps/v1/satellite/globalIR/zxy/';
var IRsatelliteLayer; // Deklarasi variabel layer satelit IR

// --- Konfigurasi Satellite WV AccuWeather ---
const ACCUWEATHER_WV_API_BASE_URL = 'https://api.accuweather.com/maps/v1/satellite/globalWV/zxy/';
var WVsatelliteLayer; // Deklarasi variabel layer satelit WV
// --- Konfigurasi Satellite VIS AccuWeather ---
const ACCUWEATHER_VIS_API_BASE_URL = 'https://api.accuweather.com/maps/v1/satellite/globalColor/zxy/';
var VISsatelliteLayer; // Deklarasi variabel layer satelit VIS

// Fungsi untuk mendapatkan timestamp AccuWeather yang dibulatkan
function getAccuweatherTimestamp(offsetIntervals = 0) {
    const now = new Date();
    const totalMinutesToSubtract = offsetIntervals * TIME_INTERVAL_MINUTES;
    now.setUTCMinutes(now.getUTCMinutes() - totalMinutesToSubtract);

    // Bulatkan ke bawah ke kelipatan TIME_INTERVAL_MINUTES terdekat
    const currentMinutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(currentMinutes / TIME_INTERVAL_MINUTES) * TIME_INTERVAL_MINUTES;
    now.setUTCMinutes(roundedMinutes, 0, 0); // Set detik dan milidetik ke 0

    return now.toISOString().split('.')[0] + "Z"; // Format YYYY-MM-DDTHH:mm:ssZ
}

// Fungsi untuk memperbarui layer satelit IR
function updateIRSatellite(timeOffsetIntervals = 0) {
    try {
        const timestamp = getAccuweatherTimestamp(timeOffsetIntervals);
        const satelliteUrl = `${ACCUWEATHER_IR_API_BASE_URL}${timestamp}/{z}/{x}/{y}.png?apikey=${ACCUWEATHER_API_KEY}`;

        if (!IRsatelliteLayer) {
            IRsatelliteLayer = L.tileLayer(satelliteUrl, {
                attribution: 'Satellite IR © <a href="https://www.accuweather.com/" target="_blank">AccuWeather</a>',
                opacity: 0.8,
                minZoom: 1,
            });
            // IRsatelliteLayer.addTo(map); // Penambahan ke map akan diatur oleh Layer Control atau di bawah
            
        } else {
            IRsatelliteLayer.setUrl(satelliteUrl);
            
        }
        // Update info timestamp IR
        const timestampInfoIRElement = document.getElementById('timestampInfoIR');
        if (timestampInfoIRElement) {
            timestampInfoIRElement.innerText = `Citra Satelit IR (Infrared) untuk: ${timestamp}`;
        }

    } catch (error) {
        console.error("Gagal membuat atau memperbarui URL satelit IR AccuWeather:", error);
        const timestampInfoIRElement = document.getElementById('timestampInfoIR');
        if (timestampInfoIRElement) {
            timestampInfoIRElement.innerText = `Gagal memuat citra satelit IR.`;
        }
    }
}

// Fungsi untuk memperbarui layer satelit WV
function updateWVSatellite(timeOffsetIntervals = 0) {
    try {
        const timestamp = getAccuweatherTimestamp(timeOffsetIntervals);
        const satelliteUrl = `${ACCUWEATHER_WV_API_BASE_URL}${timestamp}/{z}/{x}/{y}.png?apikey=${ACCUWEATHER_API_KEY}`;

        if (!WVsatelliteLayer) {
            WVsatelliteLayer = L.tileLayer(satelliteUrl, {
                attribution: 'Satellite WV © <a href="https://www.accuweather.com/" target="_blank">AccuWeather</a>',
                opacity: 0.8,
                minZoom: 1,
            });
            // WVsatelliteLayer.addTo(map); // Penambahan ke map akan diatur oleh Layer Control atau di bawah
            
        } else {
            WVsatelliteLayer.setUrl(satelliteUrl);
            
        }
        // Update info timestamp WV
        const timestampInfoWVElement = document.getElementById('timestampInfoWV');
        if (timestampInfoWVElement) {
            timestampInfoWVElement.innerText = `Citra Satelit WV (Water Vapor) untuk: ${timestamp}`;
        }

    } catch (error) {
        console.error("Gagal membuat atau memperbarui URL satelit WV AccuWeather:", error);
        const timestampInfoWVElement = document.getElementById('timestampInfoWV');
        if (timestampInfoWVElement) {
            timestampInfoWVElement.innerText = `Gagal memuat citra satelit WV.`;
        }
    }
}
// Fungsi untuk memperbarui layer satelit VIS
function updateVISSatellite(timeOffsetIntervals = 0) {
    try {
        const timestamp = getAccuweatherTimestamp(timeOffsetIntervals);
        const satelliteUrl = `${ACCUWEATHER_VIS_API_BASE_URL}${timestamp}/{z}/{x}/{y}.png?apikey=${ACCUWEATHER_API_KEY}`;

        if (!VISsatelliteLayer) {
            VISsatelliteLayer = L.tileLayer(satelliteUrl, {
                attribution: 'Satellite VIS © <a href="https://www.accuweather.com/" target="_blank">AccuWeather</a>',
                opacity: 0.8,
                minZoom: 1,
            });
            // VISsatelliteLayer.addTo(map); // Penambahan ke map akan diatur oleh Layer Control atau di bawah
            
        } else {
            VISsatelliteLayer.setUrl(satelliteUrl);
            
        }
        // Update info timestamp VIS
        const timestampInfoVISElement = document.getElementById('timestampInfoVIS');
        if (timestampInfoVISElement) {
            timestampInfoVISElement.innerText = `Citra Satelit VIS (Visible) untuk: ${timestamp}`;
        }

    } catch (error) {
        console.error("Gagal membuat atau memperbarui URL satelit VIS AccuWeather:", error);
        const timestampInfoVISElement = document.getElementById('timestampInfoVIS');
        if (timestampInfoVISElement) {
            timestampInfoVISElement.innerText = `Gagal memuat citra satelit VIS.`;
        }
    }
}

// --- Inisialisasi dan Pembaruan ---

// Tambahkan elemen untuk menampilkan info timestamp (jika belum ada di HTML Anda)
// Pastikan elemen ini ada di body HTML Anda sebelum script ini dijalankan, atau buat dinamis seperti ini.
if (!document.getElementById('timestampInfoIR')) {
    document.body.insertAdjacentHTML('beforeend', '<p id="timestampInfoIR">Memuat citra satelit IR...</p>');
}
if (!document.getElementById('timestampInfoWV')) {
    document.body.insertAdjacentHTML('beforeend', '<p id="timestampInfoWV">Memuat citra satelit WV...</p>');
}
if (!document.getElementById('timestampInfoVIS')) {
    document.body.insertAdjacentHTML('beforeend', '<p id="timestampInfoVIS">Memuat citra satelit VIS...</p>');
}

// Panggil untuk memuat citra saat pertama kali halaman dimuat
// Asumsikan 'map' adalah variabel global untuk Leaflet map Anda dan sudah diinisialisasi
// Contoh: const map = L.map('mapid').setView([lat, lon], zoom);

// updateRadar(); // Jika Anda punya fungsi ini, pastikan sudah didefinisikan

// Panggil fungsi update untuk pertama kali
updateIRSatellite();
updateWVSatellite();
updateVISSatellite();

// Set interval untuk pembaruan otomatis
	updateRadar();
        updateIRSatellite();
	updateWVSatellite();
	updateVISSatellite();
	setInterval(updateRadar, 600000);
        setInterval(updateIRSatellite, 600000);
	setInterval(updateWVSatellite, 600000); 
	setInterval(updateVISSatellite, 600000); // 10 menit
// Fungsi untuk memperbarui overlay Visible Sat bmkg
        function updateVSsatellite() {
            var timestamp = new Date().getTime();
            var newImageUrl = 'https://satelit.bmkg.go.id/IMAGE/HIMA/H08_RD_Indonesia.png' + timestamp;
            VSsatelliteLayer.setUrl(newImageUrl);
        }
        
	    
let controlContainer = null;
function addTimeControls() {
    controlContainer = document.createElement("div");
    controlContainer.style.position = "absolute";
    controlContainer.style.top = "90px";
    controlContainer.style.left = "50%";
    controlContainer.style.transform = "translateX(-50%)";
    controlContainer.style.zIndex = "1000";
    controlContainer.style.padding = "3px";
    controlContainer.style.background = "rgba(0, 0, 0, 0.6)";
    controlContainer.style.color = "white";
    controlContainer.style.border = "0px solid white";
    controlContainer.style.borderRadius = "5px";
    controlContainer.style.display = "none"; // Awalnya disembunyikan
    controlContainer.style.alignItems = "center";
    controlContainer.style.gap = "3px";

    let timeLabel = document.createElement("span");
    timeLabel.textContent = "Saat Ini";
    timeLabel.style.fontSize = "12px";

    let timeSlider = document.createElement("input");
    timeSlider.type = "range";
    timeSlider.min = "0";
    timeSlider.max = "12";
    timeSlider.value = "12";
    timeSlider.style.width = "100px";
    timeSlider.style.cursor = "pointer";

    let prevButton = document.createElement("button");
    prevButton.textContent = "⏮️";
    prevButton.style.cursor = "pointer";
    prevButton.style.border = "none";
    prevButton.style.background = "transparent";
    prevButton.style.color = "white";
    prevButton.style.fontSize = "15px";

    let playButton = document.createElement("button");
    playButton.textContent = "▶️";
    playButton.style.cursor = "pointer";
    playButton.style.border = "none";
    playButton.style.background = "transparent";
    playButton.style.color = "white";
    playButton.style.fontSize = "15px";

    let pauseButton = document.createElement("button");
    pauseButton.textContent = "⏸️";
    pauseButton.style.cursor = "pointer";
    pauseButton.style.border = "none";
    pauseButton.style.background = "transparent";
    pauseButton.style.color = "white";
    pauseButton.style.fontSize = "15px";

    let nextButton = document.createElement("button");
    nextButton.textContent = "⏭️";
    nextButton.style.cursor = "pointer";
    nextButton.style.border = "none";
    nextButton.style.background = "transparent";
    nextButton.style.color = "white";
    nextButton.style.fontSize = "15px";

    let animationInterval = null;

    function updateTimeLabel() {
        let step = 12 - parseInt(timeSlider.value);
        if (step === 0) timeLabel.textContent = "Saat Ini";
        else timeLabel.textContent = `${step * 10} menit lalu`;}

    function updateLayers(timeOffset) {
        updateRadar(timeOffset);
        updateIRSatellite(timeOffset);
	updateWVSatellite(timeOffset);
	updateVISSatellite(timeOffset);
	updateVSsatellite();
        updateTimeLabel();}

    playButton.onclick = function () {
        if (animationInterval) return;
        let step = parseInt(timeSlider.value);
        animationInterval = setInterval(() => {
            if (step > 0) step--;
            else step = 12;
            timeSlider.value = step;
            updateLayers(12 - step); }, 2000);};

    pauseButton.onclick = function () {
        clearInterval(animationInterval);
        animationInterval = null; };

    prevButton.onclick = function () {
        let step = parseInt(timeSlider.value);
        if (step > 0) {
            step--;
            timeSlider.value = step;
            updateLayers(12 - step);}
    };

    nextButton.onclick = function () {
        let step = parseInt(timeSlider.value);
        if (step < 12) {
            step++;
            timeSlider.value = step;
            updateLayers(12 - step);}
    };

    timeSlider.oninput = function () {
        let timeOffset = 12 - parseInt(timeSlider.value);
        updateLayers(timeOffset);
    };

    controlContainer.appendChild(timeLabel);
    controlContainer.appendChild(timeSlider);
    controlContainer.appendChild(prevButton);
    controlContainer.appendChild(nextButton);
    controlContainer.appendChild(playButton);
    controlContainer.appendChild(pauseButton);

    document.body.appendChild(controlContainer);}
    function checkLayerStatus() {
    // Cek apakah layer "Radar Cuaca" atau "Satelit Inframerah" aktif
    return map.hasLayer(radarLayer) || map.hasLayer(IRsatelliteLayer) || map.hasLayer(WVsatelliteLayer) || map.hasLayer(VISsatelliteLayer);
}

function toggleTimeControls() {
    if (checkLayerStatus()) {
        controlContainer.style.display = "flex"; // Tampilkan control container
    } else {
        controlContainer.style.display = "none"; // Sembunyikan control container 
    }
}

// Panggil fungsi addTimeControls untuk membuat control container
addTimeControls();

// Tambahkan event listener untuk memantau perubahan layer
map.on('layeradd layerremove', toggleTimeControls);
        var marker;
        var weatherChart;
        var chartPopup = document.getElementById('chart-popup');
        var closePopup = document.getElementById('close-popup');
        var downloadCSV = document.getElementById('download-csv');
        var downloadImg = document.getElementById('download-img');
	var locationInfo = document.getElementById('location-info');
        var modelSelect = document.getElementById('model-select');
        var currentData = {};

        function fetchWeatherData(lat, lon) {
            let model = modelSelect.value;
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,wind_speed_10m,wind_direction_10m&models=${model}&current=precipitation,wind_speed_10m,wind_direction_10m&timezone=auto&forecast_days=3&wind_speed_unit=kn`)
                .then(response => response.json())
                .then(data => {
                    let hourly = data.hourly;
                    let times = hourly.time;
                    let precipitation = hourly.precipitation;
                    let windSpeed = hourly.wind_speed_10m;
                    let windDirection = hourly.wind_direction_10m;
                    currentData = { times, precipitation, windSpeed, windDirection };
                    fetchElevation(lat, lon, times, precipitation, windSpeed, windDirection);
                })
                .catch(error => console.error('Gagal mengambil data:', error));
        }        

function fetchElevation(lat, lon, times, precipitation, windSpeed, windDirection) {
            fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)
                .then(response => response.json())
                .then(data => {
                    let elevation = data.elevation;
                    
                    if (marker) {
                        marker.bindPopup(`Koordinat: ${lat.toFixed(2)}, ${lon.toFixed(2)}<br>Elevasi: ${elevation} m<br><b>Klik untuk lihat prakiraan cuaca.</b>`).openPopup();
                    }
                    
                    currentLocation = { lat: lat.toFixed(2), lon: lon.toFixed(2), elevation: elevation };
                    locationInfo.innerHTML = `Koordinat: ${currentLocation.lat}, ${currentLocation.lon} | Elevasi: ${currentLocation.elevation} m`;
                    
                    showChart(times, precipitation, windSpeed, windDirection);
                })
                .catch(error => console.error('Gagal mengambil data elevasi:', error));
        }        

function showChart(times, precipitation, windSpeed, windDirection) {
            chartPopup.style.display = 'block';
            let ctx = document.getElementById('weatherChart').getContext('2d');
            if (weatherChart) weatherChart.destroy();
            weatherChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: times,
                    datasets: [
                        {
                            label: 'Curah Hujan (mm)',
                            data: precipitation,
                            backgroundColor: 'rgba(0, 0, 255, 0.6)',
                            borderColor: 'blue',
                            borderWidth: 1,
                            type: 'bar',
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Kecepatan Angin (knot)',
                            data: windSpeed,
                            borderColor: 'red',
                            backgroundColor: 'rgba(255, 0, 0, 0.2)',
                            fill: false,
                            type: 'line',
                            yAxisID: 'y2'
                        },
                        {
                            label: 'Arah Angin (°)',
                            data: windDirection,
                            borderColor: 'green',
                            backgroundColor: 'rgba(0, 255, 0, 0.2)',
                            fill: false,
                            type: 'line',
                            yAxisID: 'y2'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { title: { display: true, text: 'Waktu Setempat' } },
                        y1: { type: 'linear', position: 'left', beginAtZero: true },
                        y2: { type: 'linear', position: 'right', beginAtZero: true }
                    },
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: false },
                        subtitle: {
                            display: true,
                            text: `Prakiraan cuaca oleh Open-Meteo. Berdasarkan model: ${modelSelect.options[modelSelect.selectedIndex].text}`,
                            align: 'center',
                            font: { size: 12, weight: 'bold' }
                        }
                    }
                }
            });
        }

        function downloadCSVFile() {
            let csvContent = `data:text/csv;charset=utf-8,Koordinat:, ${currentLocation.lat}, ${currentLocation.lon}\nElevasi:, ${currentLocation.elevation} m\n\nWaktu Setempat,Curah Hujan (mm),Kecepatan Angin (knots),Arah Angin (o)\n`;
            currentData.times.forEach((time, index) => {
                csvContent += `${time},${currentData.precipitation[index]},${currentData.windSpeed[index]},${currentData.windDirection[index]}\n`;
            });
            let encodedUri = encodeURI(csvContent);
            let link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "Prakiraan_Cuaca.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        function downloadMeteogram() {
            let canvas = document.getElementById('weatherChart');
            let ctx = canvas.getContext('2d');
            
            let newCanvas = document.createElement('canvas');
            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height + 30;
            let newCtx = newCanvas.getContext('2d');
            newCtx.fillStyle = 'white';
            newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            newCtx.fillStyle = 'black';
            newCtx.font = '12px Arial bold';
            newCtx.textAlign = 'center';
            newCtx.fillText(`Koordinat: ${currentLocation.lat}, ${currentLocation.lon} | Elevasi: ${currentLocation.elevation} m`, newCanvas.width / 2, 20);
            newCtx.drawImage(canvas, 0, 30);
            let link = document.createElement('a');
            link.href = newCanvas.toDataURL('image/png');
            link.download = 'Meteogram.png';
            link.click();
        }

        downloadCSV.addEventListener('click', downloadCSVFile);
        downloadImg.addEventListener('click', downloadMeteogram);
        modelSelect.addEventListener('change', function() {
            if (marker) {
                let latlng = marker.getLatLng();
                fetchWeatherData(latlng.lat, latlng.lng);
            }
        });
        
            let isChartClosed = false; // Flag untuk mengecek apakah chart ditutup user

map.on('click', function(e) {
    let lat = e.latlng.lat;
    let lon = e.latlng.lng;

    if (marker) marker.remove();
    marker = L.marker([lat, lon]).addTo(map).bindPopup("Klik untuk lihat prakiraan cuaca.").openPopup();

    // Reset flag agar chart bisa muncul lagi kalau klik marker
    marker.on('click', function() {
        isChartClosed = false;
        fetchWeatherData(lat, lon); // Munculkan lagi kalau user klik markernya
    });

    // Hanya panggil fetchWeatherData saat klik peta, kalau chart belum ditutup
    if (!isChartClosed) {
        fetchWeatherData(lat, lon);
    }
});

// Saat tombol close pada chart diklik
closePopup.addEventListener('click', function() {
    chartPopup.style.display = 'none';
    isChartClosed = true; // Setelah user tutup chart, jangan munculkan lagi otomatis
});
        var airports = [
            { code: "WAAA", name: "Sultan Hasanuddin", lat: -5.07629, lon: 119.54639 },
            { code: "WABB", name: "Frans Kaisiepo", lat: -1.19208, lon: 136.10663 },
            { code: "WADD", name: "I Gusti Ngurah Rai", lat: -8.7489, lon: 115.15381 },
            { code: "WADL", name: "Lombok Praya // Zainuddin Abdul Madjid", lat: -8.74943, lon: 116.2656 },
            { code: "WAEE", name: "Sultan Babullah", lat: 0.83624, lon: 127.37781 },
            { code: "WAHI", name: "Yogyakarta International Airport", lat: -7.900296, lon: 110.058606 },
            { code: "WAJJ", name: "Sentani", lat: -2.56989, lon: 140.513 },
            { code: "WAKK", name: "Mopah", lat: -8.51709, lon: 140.41724 },
            { code: "WALL", name: "Sultan Aji Muhammad Sulaiman Sepinggan", lat: -1.26007, lon: 116.89703 },
            { code: "WAMG", name: "Djalaluddin", lat: 0.6394, lon: 122.85101 },
            { code: "WAFF", name: "Mutiara SIS-Al Jufri", lat: -0.91669, lon: 119.9104 },
            { code: "WAMM", name: "Sam Ratulangi", lat: 1.54559, lon: 124.92499 },
            { code: "WAOO", name: "Syamsudin Noor", lat: -3.44031, lon: 114.75281 },
            { code: "WAPP", name: "Pattimura", lat: -3.70917, lon: 128.09082 },
            { code: "WAQQ", name: "Juwata", lat: 3.32043, lon: 117.55359 },
            { code: "WARR", name: "Juanda", lat: -7.3819, lon: 112.80042 },
            { code: "WAHS", name: "Jenderal Ahmad Yani", lat: -6.97729, lon: 110.38104 },
            { code: "WATT", name: "El Tari", lat: -10.16888, lon: 123.68219 },
            { code: "WAUU", name: "Rendani", lat: -0.89349, lon: 134.0506 },
            { code: "WAWW", name: "Halu Oleo", lat: -4.07721, lon: 122.41742 },
            { code: "WIBB", name: "Sultan Syarif Kasim II", lat: 0.46344, lon: 101.44684 },
            { code: "WIII", name: "Soekarno Hatta", lat: -6.1286, lon: 106.65063 },
            { code: "WIHH", name: "Halim Perdanakusuma", lat: -6.27228, lon: 106.87878 },
            { code: "WILL", name: "Radin Inten II", lat: -5.2428, lon: 105.17584 },
            { code: "WIMM", name: "Kualanamu", lat: 3.6366, lon: 98.88483 },
            { code: "WIOO", name: "Supadio", lat: -0.14648, lon: 109.40582 },
            { code: "WIPP", name: "Sultan Mahmud Badaruddin II", lat: -2.8949, lon: 104.70679 },
	    { code: "WIDD", name: "Hang Nadim", lat: 1.11902, lon: 104.1142 },
        ];
        
        var markers = {};
        var airportLayer = L.layerGroup();

        // Tambahkan Marker untuk Setiap Bandara
        airports.forEach(airport => {
            var marker = L.circleMarker([airport.lat, airport.lon], {
                radius: 7,
                color: "black",
                fillColor: "white",
                fillOpacity: 0.5
            }).bindPopup(`
                <b>${airport.name} (${airport.code})</b><br>
                Memuat data METAR...<br>
                <a href='#' class="awos-link" onclick='showAWOS("${airport.code}")'>AWOS REALTIME</a>
            `);
            
            markers[airport.code] = marker;
            airportLayer.addLayer(marker);
            
            marker.on('click', function () {
                fetchMETAR();
                fetchSIGMET(airport.code);
            });
        });

        // Fungsi Menampilkan Popup AWOS
function showAWOS(code) {
    var url = `http://${code.toLowerCase()}.awosnet.com`;
    window.open(url, "_blank"); // Buka di tab baru
}
        // Fungsi Menampilkan atau Menutup Popup
        function toggleAWOS(show) {
            document.getElementById("popupAWOS").style.display = show ? "flex" : "none";
        }
        // Ambil Data METAR
        function fetchMETAR() {
            var icaoCodes = airports.map(a => a.code).join("%2C");
            var apiUrl = `/api/metar?icao=${icaoCodes}`;

            fetch(apiUrl, { headers: { 'User-Agent': 'IDWM/prayoga.ismail@bmkg.go.id' } })
                .then(response => response.text())
                .then(text => {
                    var metarData = {};
                    text.split("\n").forEach(entry => {
                        if (entry.trim() === "") return;
                        var parts = entry.split(" ");
                        var icaoCode = parts[0];
                        if (!metarData[icaoCode]) metarData[icaoCode] = [];
                        metarData[icaoCode].push(entry);
                    });

                    airports.forEach(airport => {
                        if (metarData[airport.code]) {
                            markers[airport.code].bindPopup(
                                `<b>${airport.name} (${airport.code})</b><br>${metarData[airport.code].slice(-6).map(entry => "METAR " + entry).join('<br>')}<br><a href='#' class="awos-link" onclick='showAWOS("${airport.code}")'>AWOS REALTIME</a>`
                            );
                        }
                    });
                })
                .catch(error => console.error("Gagal mengambil data METAR", error));
        }

        // Ambil Data SIGMET
        function fetchSIGMET(icao) {
            //let url = "https://api.allorigins.win/raw?url=https://aviationweather.gov/api/data/isigmet?format=json&level=3000";
	let url = "/api/sigmet";
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    // Hapus SIGMET lama
                    map.eachLayer(layer => {
                        if (layer instanceof L.Polygon) {
                            map.removeLayer(layer);
                        }
                    });

                    let sigmets = data.filter(sigmet => sigmet.icaoId === icao);
                    sigmets.forEach(sigmet => {
                        let coords = sigmet.coords.map(coord => [coord.lat, coord.lon]);
                        let color = getSigmetColor(sigmet.hazard);
                        L.polygon(coords, { color: color }).addTo(map)
                            .bindPopup(`<b>SIGMET:</b> ${sigmet.rawSigmet}`);
                    });
                })
                .catch(error => console.error("Error mengambil data SIGMET:", error));
        }

        // Warna SIGMET Berdasarkan Bahaya
        function getSigmetColor(hazard) {
            switch (hazard) {
                case "VA": return "red";
                case "TB": return "blue";
                case "IC": return "green";
                case "TS": return "yellow";
                default: return "purple";
            }
        }

        var baseMaps = {
            "Peta OSM": osmLayer,
            "Peta Esri Imagery": esriImagery,
            "Peta CartoDB": cartoPositron,
            "Peta Topografi": topoMap,
            "Peta Tutupan Lahan": lulcMap
        };
        var overlayMaps = {
	    "Satelit RDCA": VSsatelliteLayer,
            "Tekanan Udara (OWM)": pressureLayer,
	    "Satelit Visible": VISsatelliteLayer,
            "Satelit Inframerah": IRsatelliteLayer,
	    "Satelit Uap Air": WVsatelliteLayer,
	    "Sebaran hujan (OWM)": precipitationLayer,
            "Radar Cuaca": radarLayer,
            "Cuaca Bandara": airportLayer,
	    "Tropical Waves": TropicalLayer
        };
        setTimeout(() => {
            let layerControl = document.querySelector('.leaflet-control-layers');
            if (layerControl) {
                layerControl.style.marginBottom = "60px";
                layerControl.style.bottom = "auto";
                layerControl.style.top = "unset";
                layerControl.style.maxHeight = "50vh";
                layerControl.style.overflowY = "auto";
                layerControl.style.background = "rgba(255, 255, 255, 0.8)";
                layerControl.style.padding = "10px";
                layerControl.style.borderRadius = "8px";
            }
        }, 100);
        L.control.layers(baseMaps, overlayMaps, { collapsed: true, position: 'bottomleft' }).addTo(map);
        radarLayer.addTo(map);
        
	function loadmaptiler() {
    if (window.maptilerInstance) {
        window.maptilerInstance.remove();
        window.maptilerInstance = null;}

    maptilersdk.config.apiKey = 'SJePaY44QYTchyjBmpQm'; // Ganti dengan API Key Anda
    const maptiler = (window.maptilerInstance = new maptilersdk.Map({
        container: 'maptiler',
        style: maptilersdk.MapStyle.STREETS, // Style default
        zoom: 4,
        center: [118, -2.5]
    }));
    maptiler.on('load', function () {
        maptiler.setPaintProperty("Water", 'fill-color', "rgba(0, 0, 0, 0.4)");
        maptiler.addLayer(weatherLayer, 'Water');
    });
    maptiler.on('webglcontextlost', function (event) {
        event.preventDefault();
        console.log("WebGL context lost, attempting to restore...");
        setTimeout(() => {
            maptiler.triggerRepaint();}, 1000);
    });

            const timeSlider = document.getElementById("time-slider");
            const playPauseButton = document.getElementById("play-pause-bt");
            const pointerDataDiv = document.getElementById("pointer-data");
            let pointerLngLat = null;
            const weatherLayer = new maptilerweather.WindLayer();
            maptiler.on('load', function () {
                maptiler.setPaintProperty("Water", 'fill-color', "rgba(0, 0, 0, 0.4)");
                maptiler.addLayer(weatherLayer, 'Water');
            });
            timeSlider.addEventListener("input", (evt) => {
                weatherLayer.setAnimationTime(parseInt(timeSlider.value / 1000));
            });
            weatherLayer.on("sourceReady", event => {
                const startDate = weatherLayer.getAnimationStartDate();
                const endDate = weatherLayer.getAnimationEndDate();
                const currentDate = weatherLayer.getAnimationTimeDate();
                refreshTime();
                timeSlider.min = +startDate;
                timeSlider.max = +endDate;
                timeSlider.value = +currentDate;
            });
            weatherLayer.on("tick", event => {
                refreshTime();
                updatePointerValue(pointerLngLat);
            });
            weatherLayer.on("animationTimeSet", event => {
                refreshTime();
            });
            let isPlaying = false;
            playPauseButton.addEventListener("click", () => {
                if (isPlaying) {
                    weatherLayer.animateByFactor(0);
                    playPauseButton.innerText = "Play 3600x";
                } else {
                    weatherLayer.animateByFactor(3600);
                    playPauseButton.innerText = "Pause";
                }
                isPlaying = !isPlaying;
            });
            function refreshTime() {
                const d = weatherLayer.getAnimationTimeDate();
                document.getElementById("time-text").innerText = d.toString();
                timeSlider.value = +d;
            }
            function updatePointerValue(lngLat) {
                if (!lngLat) return;
                pointerLngLat = lngLat;
                const value = weatherLayer.pickAt(lngLat.lng, lngLat.lat);
                if (!value) {
                    pointerDataDiv.innerText = "";
                    return;
                }
                pointerDataDiv.innerText = `${value.speedMetersPerSecond.toFixed(1)} m/s`;
            }
            maptiler.on('mousemove', (e) => {
                updatePointerValue(e.lngLat);
            });
            maptiler.on('mouseout', function(evt) {
                if (!evt.originalEvent.relatedTarget) {
                    pointerDataDiv.innerText = "";
                    pointerLngLat = null;
                }
            });
        }
        document.addEventListener("DOMContentLoaded", function () {
            const layerRadios = document.querySelectorAll("input[name='baseLayer']");
            const mapElement = document.getElementById("map");
            const maptilerElement = document.getElementById("maptiler");
            const windControls = document.getElementById("wind-controls");
            function updateLayers(selectedLayer) {
                if (selectedLayer === "maptiler") {
                    mapElement.style.display = "none";
                    maptilerElement.style.display = "block";
                    windControls.style.display = "block";
                    if (typeof loadmaptiler === "function") loadmaptiler();
                    else console.error("Fungsi loadmaptiler tidak ditemukan!");
                } else {
                    mapElement.style.display = "block";
                    maptilerElement.style.display = "none";
                    windControls.style.display = "none";
                }
            }
            updateLayers(document.querySelector("input[name='baseLayer']:checked").value);
            layerRadios.forEach(radio => {
                radio.addEventListener("change", function () {
                    updateLayers(this.value);
                });
            });
        });
let searchMarker;

    function toggleSearch() {
        let searchBox = document.getElementById("searchBox");
        searchBox.style.display = searchBox.style.display === "block" ? "none" : "block";
    }

    document.addEventListener("click", function(event) {
        let searchBox = document.getElementById("searchBox");
        let searchToggle = document.querySelector(".search-toggle");
        if (!searchBox.contains(event.target) && !searchToggle.contains(event.target)) {
            searchBox.style.display = "none";
        }
    });

    function searchLocation() {
        let query = document.getElementById("searchInput").value.trim();
        let resultsBox = document.getElementById("searchResults");
        resultsBox.innerHTML = "";

        if (query.length < 3) return;

        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=10&language=id`)
            .then(response => response.json())
            .then(data => {
                let locations = data.results.filter(loc => loc).slice(0, 5);
                locations.forEach(location => {
                    let resultDiv = document.createElement("div");
                    let flagImg = document.createElement("img");
                    flagImg.src = `https://flagcdn.com/w40/${location.country_code.toLowerCase()}.png`;
                    resultDiv.appendChild(flagImg);
                    resultDiv.appendChild(document.createTextNode(`${location.name}, ${location.admin1}, ${location.country}`));
                    resultDiv.onclick = () => selectLocation(location);
                    resultsBox.appendChild(resultDiv);
                });
            });
    }

    function selectLocation(location) {
        let { latitude, longitude } = location;
        if (searchMarker) map.removeLayer(searchMarker);

        searchMarker = L.circleMarker([latitude, longitude], {
            color: "green",
            fillColor: "lime",
            fillOpacity: 1,
            radius: 8
        }).addTo(map);

        let blink = true;
        setInterval(() => {
            searchMarker.setStyle({ fillOpacity: blink ? 0 : 1 });
            blink = !blink;
        }, 1000);

        map.setView([latitude, longitude], 13);
        document.getElementById("searchBox").style.display = "none";
    }
