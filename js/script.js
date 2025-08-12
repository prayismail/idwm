
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
        var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'Base map &copy; OpenStreetMap contributors' });
        var esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:  'Base map &copy; Esri, DigitalGlobe, GeoEye, Earthstar Geographics' });
        var cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: 'Base map &copy; CartoDB' }).addTo(map);
        var topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'Base map &copy; <a href="https://opentopomap.org/">OpenTopoMap</a> contributors' });
        var lulcMap = L.tileLayer.wms("/api/lulc-wms", {layers: 'WORLDCOVER_2021_MAP', format: 'image/png', transparent: true, attribution: 'Base map &copy; ESA WorldCover 2021' });
        var radarLayer = L.tileLayer('', { opacity: 0.8, attribution: 'Radar data &copy; RainViewer' }); 
        var IRsatelliteLayer = L.tileLayer('', { opacity: 0.7, attribution: 'Satellite data &copy; Accuweather' }); 
	var WVsatelliteLayer = L.tileLayer('', { opacity: 0.6, attribution: 'Satellite data &copy; Accuweather' });
        var imageUrl = 'https://satelit.bmkg.go.id/IMAGE/HIMA/H08_RD_Indonesia.png';
        // Batas wilayah gambar satelit yang telah disesuaikan
        var imageBounds = [[-15, 90], [15, 150]];
        var VSsatelliteLayer = L.imageOverlay(imageUrl, imageBounds, { opacity: 0.8, attribution: 'Satellite data &copy; BMKG'});
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
        // === PERUBAHAN PADA FUNGSI GEOLOKASI (TIDAK OTOMATIS LAGI) ===
// ===================================================================

function addUserLocation() {
    // Isi fungsi ini tetap sama persis, tidak ada yang diubah
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                let userLat = position.coords.latitude;
                let userLng = position.coords.longitude;

                // Atur tampilan peta ke lokasi pengguna
                map.setView([userLat, userLng], 13); // Zoom lebih dekat saat menemukan lokasi

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
                alert("Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan di browser Anda.");
            }
        );
    } else {
        alert("Geolocation tidak didukung di browser ini.");
    }
}

// === KODE BARU: Hubungkan fungsi addUserLocation ke tombol yang baru dibuat ===
document.getElementById('locate-btn').addEventListener('click', addUserLocation);

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
                let radarUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/7/1_1.png`;
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
const ACCUWEATHER_API_KEY = 'de13920f574d420984d3080b1fa6132b'; 
const RADAR_TIME_INTERVAL_MINUTES = 5; // AccuWeather radar biasanya memiliki interval 5 menit. Sesuaikan jika perlu.


// --- Konfigurasi Radar AccuWeather ---
// Ganti 'futureSIR' jika Anda ingin menggunakan produk radar lain (misal: 'SIR' untuk data historis)
const ACCUWEATHER_RADAR_PRODUCT = 'globalSIR'; 
const ACCUWEATHER_RADAR_API_BASE_URL = `https://api.accuweather.com/maps/v1/radar/${ACCUWEATHER_RADAR_PRODUCT}/zxy/`;


/**
 * Fungsi untuk mendapatkan timestamp AccuWeather di MASA DEPAN yang dibulatkan.
 * @param {number} offsetIntervals - Kelipatan interval waktu dari sekarang (0 = citra prediksi terdekat, 1 = citra prediksi berikutnya, dst.)
 * @returns {string} Timestamp dalam format ISO (YYYY-MM-DDTHH:mm:ssZ)
 */
function getAccuweatherFutureTimestamp(offsetIntervals = 0) {
    const now = new Date();
    // Menambahkan menit ke waktu saat ini untuk mendapatkan prediksi di masa depan
    const totalMinutesToAdd = offsetIntervals * RADAR_TIME_INTERVAL_MINUTES;
    now.setUTCMinutes(now.getUTCMinutes() + totalMinutesToAdd);

    // Bulatkan ke bawah ke kelipatan RADAR_TIME_INTERVAL_MINUTES terdekat
    const currentMinutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(currentMinutes / RADAR_TIME_INTERVAL_MINUTES) * RADAR_TIME_INTERVAL_MINUTES;
    now.setUTCMinutes(roundedMinutes, 0, 0); // Set detik dan milidetik ke 0

    return now.toISOString().split('.')[0] + "Z"; // Format YYYY-MM-DDTHH:mm:ssZ
}

/**
// --- Konfigurasi Umum AccuWeather ---
const ACCUWEATHER_API_KEY = 'de13920f574d420984d3080b1fa6132b'; // PASTIKAN INI API KEY ANDA YANG VALID!
var radarLayer; // Pastikan variabel ini sudah dideklarasikan secara global.

// --- Konfigurasi Radar Historis AccuWeather ---
// UBAH: Gunakan produk 'globalSIR' untuk data radar historis global.
const ACCUWEATHER_RADAR_PRODUCT = 'globalSIR'; 
const RADAR_TIME_INTERVAL_MINUTES = 10; // Interval waktu disesuaikan dengan slider "10 menit lalu"
const ACCUWEATHER_RADAR_API_BASE_URL = `https://api.accuweather.com/maps/v1/radar/${ACCUWEATHER_RADAR_PRODUCT}/zxy/`;

/**
 * Fungsi untuk mendapatkan timestamp AccuWeather di MASA LALU yang dibulatkan.
 * @param {number} offsetIntervals - Kelipatan interval waktu ke masa lalu (0 = citra terbaru, 1 = 10 menit lalu, dst.)
 * @returns {string} Timestamp dalam format ISO (YYYY-MM-DDTHH:mm:ssZ)
 */
function getAccuweatherPastTimestamp(offsetIntervals = 0) {
    const now = new Date();
    // Mengurangi menit dari waktu saat ini untuk mendapatkan data historis
    const totalMinutesToSubtract = offsetIntervals * RADAR_TIME_INTERVAL_MINUTES;
    now.setUTCMinutes(now.getUTCMinutes() - totalMinutesToSubtract);

    // Bulatkan ke bawah ke kelipatan RADAR_TIME_INTERVAL_MINUTES terdekat
    const currentMinutes = now.getUTCMinutes();
    const roundedMinutes = Math.floor(currentMinutes / RADAR_TIME_INTERVAL_MINUTES) * RADAR_TIME_INTERVAL_MINUTES;
    now.setUTCMinutes(roundedMinutes, 0, 0); // Set detik dan milidetik ke 0

    return now.toISOString().split('.')[0] + "Z"; // Format YYYY-MM-DDTHH:mm:ssZ
}


/**
 * Fungsi untuk memperbarui layer Radar menggunakan data historis AccuWeather.
 * @param {number} timeOffset - Jumlah interval yang akan dihitung mundur (0 = citra terbaru, 1 = 10 menit lalu, dst.)
 */
function updateRadarAccuweather(timeOffset = 0) {
    try {
        // 1. Dapatkan timestamp untuk data radar di masa lalu
        const timestampString = getAccuweatherPastTimestamp(timeOffset);

        // 2. Buat URL tile radar AccuWeather
        const radarUrl = `${ACCUWEATHER_RADAR_API_BASE_URL}${timestampString}/{z}/{x}/{y}.png?apikey=${ACCUWEATHER_API_KEY}`;

        // 3. Perbarui layer peta
        if (radarLayer) {
            radarLayer.setUrl(radarUrl);
        } else {
            radarLayer = L.tileLayer(radarUrl, {
                attribution: 'Radar data &copy; Accuweather',
                opacity: 0.8,
                minZoom: 1,
                maxZoom: 12
            });
            // radarLayer.addTo(map); 
        }

        // 4. Perbarui tampilan indikator waktu
        const timeIndicator = document.getElementById('time-indicator');
        if (timeIndicator) {
            const utcTime = new Date(timestampString);
            const localTime = new Date(utcTime);
            const localTimeString = localTime.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
            });

            const bulanIndonesia = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const bulan = bulanIndonesia[utcTime.getUTCMonth()];
            
            timeIndicator.innerHTML = `
                <strong>${utcTime.getUTCDate()} ${bulan} ${utcTime.getUTCFullYear()}</strong><br>
                <span style="color: #FFD700;">${utcTime.getUTCHours().toString().padStart(2, '0')}:${utcTime.getUTCMinutes().toString().padStart(2, '0')} UTC</span><br>
                <span style="color: #00FF00;">${localTimeString} Waktu Setempat</span>
            `;
        }
    } catch (error) {
        console.error("Gagal membuat atau memperbarui URL radar AccuWeather:", error);
        const timeIndicator = document.getElementById('time-indicator');
        if (timeIndicator) {
            timeIndicator.innerText = `Gagal memuat citra radar.`;
        }
    }
}
	
// --- Konfigurasi Umum AccuWeather ---
//const ACCUWEATHER_API_KEY = 'de13920f574d420984d3080b1fa6132b'; // GANTI DENGAN API KEY ANDA YANG VALID!
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
                attribution: 'Satellite data &copy; Accuweather',
                opacity: 0.6,
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
                attribution: 'Satellite data &copy; Accuweather',
                opacity: 0.6,
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
                attribution: 'Satellite data &copy; Accuweather',
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

// updateRadarAccuweather(); // Jika Anda punya fungsi ini, pastikan sudah didefinisikan

// Panggil fungsi update untuk pertama kali
updateIRSatellite();
updateWVSatellite();
updateVISSatellite();

// Set interval untuk pembaruan otomatis
updateRadar();	
//updateRadarAccuweather();
        updateIRSatellite();
	updateWVSatellite();
	updateVISSatellite();
setInterval(updateRadar, 600000);
//	setInterval(updateRadarAccuweather, 300000);
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
		//updateRadarAccuweather(timeOffset);
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
//LAYER PRAKIRAAN CUACA//
var marker;
var weatherChart;
var chartPopup = document.getElementById('chart-popup');
var closePopup = document.getElementById('close-popup');
var downloadCSV = document.getElementById('download-csv');
var downloadImg = document.getElementById('download-img');
var locationInfo = document.getElementById('location-info');
var modelSelect = document.getElementById('model-select');
var currentData = {};
var currentLocation = {};
var marker; // Variabel global untuk marker

// ===================================================================
// PENGATURAN KONTROL LAYER
// ===================================================================

// 1. Buat layer grup kosong sebagai placeholder untuk kontrol layer.
var weatherForecastLayer = L.layerGroup();

// 2. State untuk melacak apakah layer prakiraan cuaca aktif (dicentang)
var isWeatherLayerActive = false;


// ===================================================================
// FUNGSI-FUNGSI UTAMA
// ===================================================================

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
        .catch(error => {
            console.error('Gagal mengambil data cuaca:', error);
            locationInfo.innerHTML = 'Gagal mengambil data cuaca. Coba lagi.';
        });
}

function fetchElevation(lat, lon, times, precipitation, windSpeed, windDirection) {
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)
        .then(response => response.json())
        .then(data => {
            let elevation = data.elevation;
            currentLocation = { lat: lat.toFixed(2), lon: lon.toFixed(2), elevation: elevation };

            // === PERUBAHAN KUNCI ADA DI SINI ===
            // Perbarui konten popup marker yang sudah ada dengan info elevasi.
            if (marker) {
                marker.setPopupContent(`<b>Elevasi: ${elevation} m</b><br>Koordinat: ${currentLocation.lat}, ${currentLocation.lon}`);
            }
            
            // Perbarui info di atas chart
            locationInfo.innerHTML = `Koordinat: ${currentLocation.lat}, ${currentLocation.lon} | Elevasi: ${currentLocation.elevation} m`;
            
            // Tampilkan chart cuaca
            showChart(times, precipitation, windSpeed, windDirection);
        })
        .catch(error => {
            console.error('Gagal mengambil data elevasi:', error);
            locationInfo.innerHTML = `Gagal mengambil data elevasi untuk lokasi ini.`;
        });
}

function showChart(times, precipitation, windSpeed, windDirection) {
    chartPopup.style.display = 'block';
    let ctx = document.getElementById('weatherChart').getContext('2d');
    if (weatherChart) weatherChart.destroy();
    
    weatherChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: times.map(t => new Date(t).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })),
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
                y1: { type: 'linear', position: 'left', beginAtZero: true, title: { display: true, text: 'Curah Hujan (mm)'} },
                y2: { type: 'linear', position: 'right', beginAtZero: true, title: { display: true, text: 'Angin'} }
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
    let csvContent = `data:text/csv;charset=utf-8,Koordinat:, ${currentLocation.lat}, ${currentLocation.lon}\nElevasi:, ${currentLocation.elevation} m\n\nWaktu Setempat,Curah Hujan (mm),Kecepatan Angin (knots),Arah Angin (°)\n`;
    currentData.times.forEach((time, index) => {
        csvContent += `${time},${currentData.precipitation[index]},${currentData.windSpeed[index]},${currentData.windDirection[index]}\n`;
    });
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Prakiraan_Cuaca_${currentLocation.lat}_${currentLocation.lon}.csv`);
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
    link.download = `Meteogram_${currentLocation.lat}_${currentLocation.lon}.png`;
    link.click();
}

// ===================================================================
// EVENT LISTENERS
// ===================================================================

map.on('overlayadd', function(e) {
    if (e.layer === weatherForecastLayer) {
        isWeatherLayerActive = true;
    }
});

map.on('overlayremove', function(e) {
    if (e.layer === weatherForecastLayer) {
        isWeatherLayerActive = false;
        chartPopup.style.display = 'none';
        if (marker) {
            marker.remove();
        }
    }
});

// PERUBAHAN ADA DI FUNGSI INI
map.on('click', function(e) {
    if (isWeatherLayerActive) {
        let lat = e.latlng.lat;
        let lon = e.latlng.lng;

        if (marker) {
            marker.remove();
        }
        marker = L.marker([lat, lon]).addTo(map);

        // Bind popup dengan teks awal (tanpa elevasi)
        marker.bindPopup(`Koordinat: ${lat.toFixed(2)}, ${lon.toFixed(2)}<br><b>Klik untuk melihat prakiraan...</b>`).openPopup();

        // Tambahkan event listener PADA MARKER
        marker.on('click', function() {
            locationInfo.innerHTML = `Mengambil data untuk ${lat.toFixed(2)}, ${lon.toFixed(2)}...`;
            if (weatherChart) {
                weatherChart.destroy();
            }
            fetchWeatherData(lat, lon);
        });
    }
});

closePopup.addEventListener('click', function() {
    chartPopup.style.display = 'none';
});

downloadCSV.addEventListener('click', downloadCSVFile);
downloadImg.addEventListener('click', downloadMeteogram);

modelSelect.addEventListener('change', function() {
    if (marker && chartPopup.style.display === 'block') {
        let latlng = marker.getLatLng();
        fetchWeatherData(latlng.lat, latlng.lng);
    }
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
			{ code: "WIEE", name: "Minangkabau", lat: -0.79, lon: 100.28 },
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
// Data poligon FIR UPG (WAAF)
    var firUPG_geojson = {
        "type": "Feature",
        "properties": { "location": "UJUNG PANDANG", "code": "WAAF" },
        "geometry": { "type": "Polygon", "coordinates": [[[140.99, -6.32], [141, -6.32], [141, 3.5], [133, 3.5], [132.53, 4], [118, 4], [117.89, 4.18], [117.68, 4.17], [117.61, 4.14], [117.54, 4.17], [117.53, 4.16], [117.48, 4.17], [117.44, 4.19], [117.43, 4.23], [117.39, 4.26], [117.37, 4.29], [117.31, 4.3], [117.25, 4.37], [117.23, 4.37], [117.2, 4.34], [117.15, 4.35], [117.11, 4.33], [117.04, 4.35], [117.02, 4.32], [117.01, 4.32], [117.01, 4.35], [116.97, 4.34], [116.91, 4.37], [116.84, 4.33], [116.82, 4.35], [116.79, 4.34], [116.75, 4.39], [116.71, 4.33], [116.67, 4.35], [116.63, 4.34], [116.61, 4.38], [116.59, 4.37], [116.56, 4.41], [116.52, 4.33], [116.49, 4.33], [116.48, 4.3], [116.44, 4.29], [116.43, 4.33], [116.35, 4.39], [116.28, 4.36], [116.17, 4.39], [116.17, 4.33], [116.12, 4.34], [116.07, 4.28], [116.03, 4.3], [116.03, 4.33], [116, 4.35], [115.93, 4.35], [115.91, 4.39], [115.88, 4.39], [115.86, 4.34], [115.87, 4.29], [115.83, 4.26], [115.82, 4.23], [115.8, 4.22], [115.79, 4.24], [115.77, 4.24], [115.73, 4.19], [115.7, 4.19], [115.68, 4.16], [115.64, 3.96], [115.62, 3.94], [115.59, 3.94], [115.56, 3.92], [115.58, 3.88], [115.62, 3.87], [115.61, 3.82], [115.58, 3.75], [115.57, 3.65], [115.58, 3.6], [115.61, 3.55], [115.61, 3.51], [115.66, 3.44], [115.62, 3.41], [115.61, 3.45], [115.59, 3.45], [115.54, 3.36], [115.55, 3.33], [115.53, 3.32], [115.52, 3.25], [115.53, 3.23], [115.52, 3.22], [115.52, 3.19], [115.56, 3.17], [115.56, 3.15], [115.54, 3.14], [115.51, 3.11], [115.52, 3.06], [115.5, 3.03], [115.44, 3.02], [115.4, 2.98], [115.33, 2.98], [115.32, 3.01], [115.28, 3.05], [115.25, 2.97], [115.16, 2.93], [115.15, 2.91], [115.15, 2.87], [115.09, 2.82], [115.15, 2.79], [115.14, 2.75], [115.09, 2.7], [115.11, 2.69], [115.12, 2.65], [115.09, 2.61], [115.11, 2.58], [115.18, 2.61], [115.22, 2.54], [115.25, 2.54], [115.25, 2.51], [115.2, 2.47], [115.14, 2.48], [115.12, 2.45], [115.1, 2.4], [115.05, 2.4], [115.05, 2.39], [115.04, 2.39], [115.03, 2.36], [115, 2.35], [114.96, 2.37], [114.95, 2.32], [114.97, 2.29], [114.92, 2.26], [114.87, 2.26], [114.83, 2.25], [114.82, 2.26], [114.79, 2.2], [114.74, 2.19], [114.74, 2.14], [114.8, 2.15], [114.82, 2.13], [114.8, 2.09], [114.81, 2.06], [114.79, 2.06], [114.81, 2.02], [114.86, 2.04], [114.89, 2.02], [114.85, 1.96], [114.88, 1.91], [114.82, 1.89], [114.79, 1.85], [114.75, 1.87], [114.72, 1.86], [114.73, 1.83], [114.69, 1.81], [114.72, 1.78], [114.71, 1.64], [114.65, 1.59], [114.61, 1.57], [114.6, 1.53], [114.62, 1.52], [114.59, 1.45], [114.52, 1.44], [114.5, 1.48], [114.47, 1.48], [114.41, 1.52], [114.38, 1.52], [114.38, 1.49], [114.33, 1.48], [114.3, 1.46], [114.24, 1.45], [114.21, 1.41], [114.14, 1.47], [113.97, 1.45], [113.92, 1.41], [113.82, 1.37], [113.83, 1.34], [113.8, 1.3], [113.7, 1.27], [113.67, 1.22], [113.63, 1.22], [113.62, 1.25], [110.38, -3], [110.38, -8.33], [114.5, -12], [123.33, -12], [126.83, -9.33], [135, -7], [139.67, -9.83], [141, -9.83], [141.03, -9.62], [141.02, -6.89], [140.99, -6.9], [140.97, -6.89], [140.95, -6.91], [140.94, -6.89], [140.95, -6.86], [140.94, -6.87], [140.92, -6.87], [140.9, -6.84], [140.92, -6.82], [140.87, -6.79], [140.9, -6.75], [140.85, -6.72], [140.85, -6.68], [140.87, -6.68], [140.86, -6.66], [140.87, -6.65], [140.86, -6.64], [140.88, -6.62], [140.84, -6.61], [140.9, -6.59], [140.91, -6.57], [140.89, -6.57], [140.89, -6.56], [140.94, -6.56], [140.92, -6.55], [140.92, -6.5], [140.96, -6.49], [140.95, -6.47], [140.95, -6.45], [140.92, -6.47], [140.94, -6.44], [140.92, -6.42], [140.95, -6.43], [140.94, -6.41], [140.98, -6.39], [140.94, -6.38], [140.98, -6.36], [140.96, -6.35], [140.96, -6.33], [140.99, -6.32]]] }
    };

    // Data poligon FIR Jakarta (WIIF)
    var firJakarta_geojson = {
        "type": "Feature",
        "properties": { "location": "JAKARTA", "code": "WIIF" },
        "geometry": { "type": "Polygon", "coordinates": [ [ [92.0, 6.0], [97.5, 6.0], [102.17, 1.65], [102.69, 1.48], [103.5, 1.22], [103.53, 1.24], [103.65, 1.2], [103.67, 1.18], [103.75, 1.13], [104.0, 1.25], [104.5, 1.3], [104.58, 1.49], [104.77, 1.33], [105.37, 2.31], [105.22, 2.61], [105.15, 2.73], [105.2, 2.84], [105.44, 3.25], [105.5, 3.29], [105.86, 3.51], [107.3, 4.22], [107.55, 4.64], [107.77, 4.87], [107.92, 4.98], [108.03, 5.0], [108.27, 4.95], [109.27, 2.85], [108.5, 2.25], [108.5, 1.0], [113.62, 1.25], [110.38, -3.0], [110.38, -8.33], [114.5, -12.0], [110.0, -12.0], [107.0, -12.0], [105.08, -10.78], [103.42, -9.71], [101.3, -8.31], [98.95, -6.75], [96.62, -5.17], [94.55, -3.76], [92.0, -2.0], [92.0, 6.0] ] ] }
    };

    // --- SOLUSI: Menggambar FIR sebagai Garis (Polyline) bukan Area (Polygon) ---

    // 1. Ambil data koordinat mentah dari GeoJSON
    // GeoJSON formatnya [lng, lat], Leaflet butuh [lat, lng], jadi kita balik.
    var jakartaCoords = firJakarta_geojson.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
    var upgCoords = firUPG_geojson.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);

    // 2. Gambar sebagai L.polyline
    L.polyline(jakartaCoords, {
        color: "purple",
        weight: 3, // Dibuat lebih tebal agar jelas
        opacity: 0.8,
        interactive: false
    }).addTo(map);

    L.polyline(upgCoords, {
        color: "maroon",
        weight: 3, // Dibuat lebih tebal agar jelas
        opacity: 0.8,
        interactive: false
    }).addTo(map);


// Ambil Data SIGMET
// BAGIAN 1: FUNGSI-FUNGSI PEMBANTU (TIDAK ADA PERUBAHAN)
// -------------------------------------------------------------------------

function parseCoordString(coordStr) {
    const coords = [];
    if (!coordStr) return coords;
    const pairs = coordStr.trim().split(/\s*-\s*/);
    const pairRegex = /([NS])\s*([\d\s]+)\s*([EW])\s*([\d\s]+)/;

    for (const pair of pairs) {
        if (!pair) continue;
        const match = pair.match(pairRegex);
        if (match) {
            let latStr = match[2].replace(/\s/g, '');
            let lonStr = match[4].replace(/\s/g, '');
            const latDeg = parseInt(latStr.substring(0, 2), 10);
            const latMin = latStr.length > 2 ? parseInt(latStr.substring(2), 10) : 0;
            let lat = (latDeg + latMin / 60) * (match[1] === 'S' ? -1 : 1);
            const lonDeg = parseInt(lonStr.substring(0, 3), 10);
            const lonMin = lonStr.length > 3 ? parseInt(lonStr.substring(3), 10) : 0;
            let lon = (lonDeg + lonMin / 60) * (match[3] === 'W' ? -1 : 1);
            if (!isNaN(lat) && !isNaN(lon)) {
                coords.push([parseFloat(lat.toFixed(4)), parseFloat(lon.toFixed(4))]);
            }
        }
    }
    return coords;
}

function parseDescriptiveCoord(coordStr) {
    const dir = coordStr.charAt(0).toUpperCase();
    let deg, min;
    if (dir === 'N' || dir === 'S') {
        deg = parseFloat(coordStr.substring(1, 3));
        min = parseFloat(coordStr.substring(3, 5));
    } else {
        deg = parseFloat(coordStr.substring(1, 4));
        min = parseFloat(coordStr.substring(4, 6));
    }
    let value = deg + (min / 60);
    return (dir === 'S' || dir === 'W') ? -value : value;
}


// BAGIAN 2: FUNGSI PARSER UTAMA (SUDAH BENAR, TIDAK PERLU DIUBAH)
// -------------------------------------------------------------------------

function parseMultiPolygonSigmet(rawText, firToIntersectWith) {
    const singleLineText = rawText.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ');
    const polygons = [];

    // Regex ini sudah kuat untuk mengenali semua jenis poligon berbasis titik
    const pointBasedRegex = /(?:VA CLD OBS AT \d{4}Z WI|EMBD TS OBS WI|(?:SEV|MOD)?\s+(?:TURB|ICE)\s+(?:OBS|FCST)?(?:\s+AT\s+\d{4}Z)?\s+WI|AND\s+OBS\s+AT\s+\d{4}Z\s+WI)\s+(.*?)\s*(SFC\s*\/\s*F\s*L\d+|F\s*L\d+\s*\/\s*(?:F\s*L)?\d+|(?:TOP\s+)?F\s*L\d+)/gi;
    let match;

    while ((match = pointBasedRegex.exec(singleLineText)) !== null) {
        const coordinates = parseCoordString(match[1].trim());
        if (coordinates.length > 2) {
            coordinates.push(coordinates[0]);
            polygons.push({
                coords: coordinates,
                level: match[2] ? match[2].trim().replace(/\s+/g, ' ') : 'N/A'
            });
        }
    }

    if (polygons.length === 0) {
        const descriptiveRegex = /(?:(ENTIRE)\s+(FIR|UIR|CTA))|(?:([NSEW])\s+OF\s+([NSEW]\d+))(?:\s+AND\s+([NSEW])\s+OF\s+([NSEW]\d+))?/i;
        const descriptiveMatch = descriptiveRegex.exec(singleLineText);

        if (descriptiveMatch) {
            if (!firToIntersectWith || !firToIntersectWith.geometry) {
                console.error("Data GeoJSON pemotong tidak valid.", singleLineText);
                return [];
            }
            let minLon = -180, minLat = -90, maxLon = 180, maxLat = 90;
            if (!(descriptiveMatch[1] && descriptiveMatch[1].toUpperCase() === 'ENTIRE')) {
                const processPart = (direction, coordStr) => {
                    if (!direction || !coordStr) return;
                    const val = parseDescriptiveCoord(coordStr);
                    const dir = direction.toUpperCase();
                    if (dir === 'N') minLat = val;
                    if (dir === 'S') maxLat = val;
                    if (dir === 'E') minLon = val;
                    if (dir === 'W') maxLon = val;
                };
                processPart(descriptiveMatch[3], descriptiveMatch[4]);
                processPart(descriptiveMatch[5], descriptiveMatch[6]);
            }
            const sigmetAreaPolygon = turf.polygon([[[minLon, minLat], [maxLon, minLat], [maxLon, maxLat], [minLon, maxLat], [minLon, minLat]]]);
            const intersection = turf.intersect(firToIntersectWith, sigmetAreaPolygon);
            if (intersection) {
                const levelMatch = singleLineText.match(/(SFC\s*\/\s*F\s*L\d+|F\s*L\d+\s*\/\s*(?:F\s*L)?\d+|(?:TOP\s+)?F\s*L\d+)/i);
                const level = levelMatch ? levelMatch[0].trim().replace(/\s+/g, ' ') : 'N/A';
                const processCoords = (coords) => coords.map(point => [point[1], point[0]]);
                if (intersection.geometry.type === 'Polygon') {
                    polygons.push({ coords: processCoords(intersection.geometry.coordinates[0]), level: level });
                } else if (intersection.geometry.type === 'MultiPolygon') {
                    intersection.geometry.coordinates.forEach(polyCoords => { polygons.push({ coords: processCoords(polyCoords[0]), level: level }); });
                }
            }
        }
    }
    if (polygons.length === 0) {
        console.warn("SIGMET ditemukan, tetapi tidak ada poligon yang bisa di-parse:", singleLineText);
    }
    return polygons;
}


// BAGIAN 3: FUNGSI FETCH UTAMA - DENGAN LOGIKA FILTER YANG DISEMPURNAKAN
// -------------------------------------------------------------------------

function fetchSIGMET(firIcao) {
    let url = "/api/sigmet";
    const hazardPriority = {'VA': 1, 'TS': 2, 'ICE': 3, 'TURB': 3, 'default': 4};

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            map.eachLayer(layer => {
                if (layer.options && layer.options.isSigmetPolygon) map.removeLayer(layer);
            });

            let relevantSigmets;
            let firToUseForClipping;

            // === INI ADALAH PERBAIKAN KUNCI ===
            // Filter berdasarkan ICAO yang di-klik, dengan memeriksa DUA kemungkinan identifier
            if (firIcao === 'WIII') { // FIR Jakarta
                console.log("Filtering for Jakarta (WSID20 or WVID20)...");
                relevantSigmets = data.filter(sigmet => 
                    sigmet.rawSigmet.includes('WSID20') || sigmet.rawSigmet.includes('WVID20')
                );
                firToUseForClipping = firJakarta_geojson;
            } else if (firIcao === 'WAAA') { // FIR Ujung Pandang
                console.log("Filtering for Ujung Pandang (WSID21 or WVID21)...");
                relevantSigmets = data.filter(sigmet => 
                    sigmet.rawSigmet.includes('WSID21') || sigmet.rawSigmet.includes('WVID21')
                );
                firToUseForClipping = firUPG_geojson;
            } else {
                return; // Jika ICAO tidak dikenal, jangan lakukan apa-apa
            }
            
            if (relevantSigmets.length === 0) {
                console.log(`Tidak ada SIGMET aktif untuk FIR ${firIcao}`);
                return;
            }

            relevantSigmets.sort((a, b) => (hazardPriority[a.hazard] || 4) - (hazardPriority[b.hazard] || 4));
            
            relevantSigmets.forEach(sigmet => {
                // Gunakan GeoJSON yang sudah ditentukan di atas
                const parsedPolygons = parseMultiPolygonSigmet(sigmet.rawSigmet, firToUseForClipping);
                
                if (parsedPolygons.length === 0) return;
                
                const color = getSigmetColor(sigmet.hazard);
                const sigmetId = sigmet.sigmetId ? ` ${sigmet.sigmetId}` : '';

                parsedPolygons.forEach(polygonData => {
                    const popupContent = `
                        <div class="sigmet-popup-header" style="background-color: ${color};">
                            ${sigmet.hazard} SIGMET${sigmetId}
                        </div>
                        <div class="sigmet-popup-body">
                            <div class="sigmet-level-info">
                                <strong>Level:</strong> ${polygonData.level}
                            </div>
                            <hr>
                            <div class="sigmet-raw-text">
                                <pre style="margin: 0; white-space: pre-wrap;">${sigmet.rawSigmet}</pre>
                            </div>
                        </div>`;

                    L.polygon(polygonData.coords, { 
                        color: color, fillColor: color, fillOpacity: 0.2, weight: 2, isSigmetPolygon: true
                    }).addTo(map).bindPopup(popupContent, { className: 'custom-sigmet-popup' });
                });
            });
        })
        .catch(error => console.error("Error mengambil atau memproses data SIGMET:", error));
}


// BAGIAN 4: FUNGSI UTILITAS WARNA - TIDAK DIUBAH
// -------------------------------------------------------------------------

function getSigmetColor(hazard) {
    switch (hazard) {
        case "VA": return "blue";
        case "TURB": return "orange";
        case "ICE": return "green";
        case "TS": return "red";
        default: return "purple";
    }
}
// Variabel state dan elemen UI
    const flSelectorContainer = document.getElementById('fl-selector-container');
    const flSelector = document.getElementById('fl-selector');
    const legend = document.getElementById('turbulence-legend');
    const sliderContainer = document.getElementById('time-slider-container');
    const timeSlider = document.getElementById('time-slider');
    const timeDisplay = document.getElementById('time-display');
    const sliderTicks = document.getElementById('slider-ticks');
    const prevButton = document.getElementById('slider-prev');
    const nextButton = document.getElementById('slider-next');
    
    const imageBound2 = [[-90, -180], [90, 180]];
    const forecastHours = ['06', '09', '12', '15', '18', '21', '24'];
    const flightLevels = [
        { name: "Turb FL450/148mb", code: "148" }, { name: "Turb FL390/197mb", code: "197" },
        { name: "Turb FL340/250mb", code: "250" }, { name: "Turb FL300/301mb", code: "301" },
        { name: "Turb FL270/344mb", code: "344" }, { name: "Turb FL240/393mb", code: "393" },
        { name: "Turb FL180/506mb", code: "506" }, { name: "Turb FL140/595mb", code: "595" }
    ];

    let wafsInfo = {};
    let turbulenceLayers = {};
    let currentTurbulenceLayer = null;

    // =====================================================================
    // === FUNGSI YANG DIPERBAIKI: getLatestWafsCycle ===
    // =====================================================================
    function getLatestWafsCycle() {
    // Buat objek waktu saat ini dalam UTC
    const now = new Date();

    // **PERBAIKAN UTAMA**: Mundurkan waktu 5 jam untuk memastikan data model sudah dipublikasikan.
    const lookbackTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));

    const utcHours = lookbackTime.getUTCHours();
    let cycleHour;
    
    // Tentukan cycle berdasarkan waktu yang sudah dimundurkan
    // Logika ini tetap sama, tetapi sekarang lebih andal karena lookbackTime lebih panjang.
    if (utcHours < 6) { cycleHour = '00'; } 
    else if (utcHours < 12) { cycleHour = '06'; } 
    else if (utcHours < 18) { cycleHour = '12'; } 
    else { cycleHour = '18'; }

    // Gunakan tanggal dari waktu yang sudah dimundurkan untuk memastikan konsistensi
    const year = lookbackTime.getUTCFullYear();
    const month = String(lookbackTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(lookbackTime.getUTCDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;
    
    return {
        dateString: dateString,
        cycle: cycleHour,
        baseDate: new Date(`${dateString.slice(0,4)}-${dateString.slice(4,6)}-${dateString.slice(6,8)}T${cycleHour}:00:00Z`)
    };
}

    // Fungsi-fungsi lainnya tidak berubah
    function populateFlightLevelDropdown() {
        flightLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.code;
            option.textContent = level.name;
            flSelector.appendChild(option);
        });
        flSelector.value = "301";
    }

    function createLayersForFlightLevel(levelCode) {
        turbulenceLayers = {};
        forecastHours.forEach(hour => {
            const imageUrl = `https://aviationweather.gov/data/products/wafs/${wafsInfo.dateString}/${wafsInfo.cycle}/${wafsInfo.dateString}_${wafsInfo.cycle}_F${hour}_wafs_${levelCode}_edr_m.png`;
            turbulenceLayers[hour] = L.imageOverlay(imageUrl, imageBound2, { opacity: 1, interactive: false });
        });
    }

    function updateMapAndUI(index) {
        if (currentTurbulenceLayer && map.hasLayer(currentTurbulenceLayer)) {
            map.removeLayer(currentTurbulenceLayer);
        }
        const hour = forecastHours[index];
        const newLayer = turbulenceLayers[hour];
        if (newLayer) {
            newLayer.addTo(map);
            currentTurbulenceLayer = newLayer;
        }
        const validTime = new Date(wafsInfo.baseDate);
        validTime.setUTCHours(validTime.getUTCHours() + parseInt(hour));
        const timeString = validTime.toUTCString().replace("GMT", "UTC");
        timeDisplay.textContent = `+${hour}hr ${timeString.slice(17,22)} UTC ${timeString.slice(5, 16)}`;
        timeSlider.value = index;
    }
    
    // Inisialisasi Awal dan Event Listeners
    wafsInfo = getLatestWafsCycle();
    populateFlightLevelDropdown();

    timeSlider.min = 0;
    timeSlider.max = forecastHours.length - 1;
    sliderTicks.innerHTML = '';
    forecastHours.forEach(hour => {
        const tickDate = new Date(wafsInfo.baseDate);
        tickDate.setUTCHours(tickDate.getUTCHours() + parseInt(hour));
        const tickLabel = `${String(tickDate.getUTCDate()).padStart(2, '0')}/${String(tickDate.getUTCHours()).padStart(2, '0')}Z`;
        sliderTicks.innerHTML += `<span>${tickLabel}</span>`;
    });

    flSelector.addEventListener('change', (e) => {
        const newLevelCode = e.target.value;
        createLayersForFlightLevel(newLevelCode);
        updateMapAndUI(parseInt(timeSlider.value));
    });

    timeSlider.addEventListener('input', (e) => updateMapAndUI(parseInt(e.target.value)));
    prevButton.addEventListener('click', () => {
        let newIndex = parseInt(timeSlider.value) - 1;
        if (newIndex >= 0) updateMapAndUI(newIndex);
    });
    nextButton.addEventListener('click', () => {
        let newIndex = parseInt(timeSlider.value) + 1;
        if (newIndex < forecastHours.length) updateMapAndUI(newIndex);
    });
// === BAGIAN 6: JAVASCRIPT UNTUK ALAT SIGMET (DENGAN FITUR SEDERHANAKAN / SIMPLIFY) ===
// ==================================================================================

// 1. Inisialisasi variabel dan elemen UI
const sigmetToolPanel = document.getElementById('sigmet-tool');
const closeBtn = document.getElementById('sigmet-tool-close-btn');
const startDrawBtn = document.getElementById('start-draw-btn');
const clearDrawBtn = document.getElementById('clear-draw-btn');
const clipFirBtn = document.getElementById('clip-fir-btn');
const simplifyBtn = document.getElementById('simplify-btn'); // Tombol baru
const generateBtn = document.getElementById('generate-sigmet-btn');
const copyBtn = document.getElementById('copy-sigmet-btn');
const sigmetOutput = document.getElementById('sigmet-output');
const phenomenonSelect = document.getElementById('sigmet-phenomenon');
const obsTimeGroup = document.getElementById('obs-time-group');
const startTimeInput = document.getElementById('sigmet-start-time');
const endTimeInput = document.getElementById('sigmet-end-time');
const add4hBtn = document.getElementById('sigmet-add-4h-btn');
const nowBtn = document.getElementById('sigmet-now-btn');

let drawnPolygon = null;
let polygonDrawer = null;
let drawnCoordinates = [];
let isSimplified = false; // Flag untuk menandai apakah format deskriptif sedang digunakan
const drawnItems = new L.FeatureGroup().addTo(map);

// 2. Event Listeners untuk tombol-tombol
closeBtn.addEventListener('click', () => sigmetToolPanel.classList.add('hidden'));

nowBtn.addEventListener('click', () => {
    const now = new Date();
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    const minute = String(now.getUTCMinutes()).padStart(2, '0');
    startTimeInput.value = `${day}${hour}${minute}`;
});

add4hBtn.addEventListener('click', () => {
    const startTimeStr = startTimeInput.value;
    if (startTimeStr.length !== 6 || isNaN(startTimeStr)) {
        alert("Format Start Time salah. Gunakan format DDHHMM.");
        return;
    }
    const day = parseInt(startTimeStr.substring(0, 2));
    const hour = parseInt(startTimeStr.substring(2, 4));
    const minute = parseInt(startTimeStr.substring(4, 6));
    const startDate = new Date();
    startDate.setUTCDate(day);
    startDate.setUTCHours(hour, minute, 0, 0);
    startDate.setUTCHours(startDate.getUTCHours() + 4);
    const endDay = String(startDate.getUTCDate()).padStart(2, '0');
    const endHour = String(startDate.getUTCHours()).padStart(2, '0');
    const endMinute = String(startDate.getUTCMinutes()).padStart(2, '0');
    endTimeInput.value = `${endDay}${endHour}${endMinute}`;
});

startDrawBtn.addEventListener('click', () => {
    if (polygonDrawer) polygonDrawer.disable();
    isSimplified = false; // Reset status simplified
    polygonDrawer = new L.Draw.Polygon(map, {
        shapeOptions: { color: '#ff0000', weight: 3 },
        allowIntersection: false, showArea: false
    });
    polygonDrawer.enable();
});

clearDrawBtn.addEventListener('click', () => {
    drawnItems.clearLayers();
    drawnPolygon = null;
    drawnCoordinates = [];
    isSimplified = false;
    sigmetOutput.value = '';
});

phenomenonSelect.addEventListener('change', function() {
    obsTimeGroup.classList.toggle('hidden', this.value !== 'OBS');
});

generateBtn.addEventListener('click', generateSigmetText);

copyBtn.addEventListener('click', () => {
    if (!sigmetOutput.value) return;
    navigator.clipboard.writeText(sigmetOutput.value)
        .then(() => alert('Teks SIGMET berhasil disalin!'))
        .catch(() => alert('Gagal menyalin teks.'));
});

map.on(L.Draw.Event.CREATED, event => {
    clearDrawBtn.click(); // Bersihkan dulu untuk reset state
    const layer = event.layer;
    drawnPolygon = layer;
    drawnItems.addLayer(layer);
    updateCoordinatesFromLayer(layer);
    generateSigmetText();
});

clipFirBtn.addEventListener('click', () => {
    if (!drawnPolygon) {
        alert("Gambar sebuah poligon terlebih dahulu!");
        return;
    }
    const drawnPolygonTurf = drawnPolygon.toGeoJSON();
    const firUPGTurf = firUPG_geojson;
    try {
        const intersection = turf.intersect(firUPGTurf, drawnPolygonTurf);
        if (!intersection) {
            alert("Poligon yang Anda gambar tidak berpotongan dengan area FIR UPG.");
            clearDrawBtn.click();
            return;
        }
        const clippedLayer = L.geoJSON(intersection, {
            style: { color: '#00ff00', weight: 3, fillColor: '#00ff00', fillOpacity: 0.2 }
        }).getLayers()[0];
        drawnItems.clearLayers();
        drawnPolygon = clippedLayer;
        drawnItems.addLayer(clippedLayer);
        updateCoordinatesFromLayer(clippedLayer);
        isSimplified = false; // Reset status, karena ini poligon baru
        generateSigmetText();
    } catch (error) {
        console.error("Gagal melakukan operasi pemotongan:", error);
        alert("Terjadi kesalahan saat memotong poligon.");
    }
});




// 3. Fungsi-fungsi pembantu
function updateCoordinatesFromLayer(layer) {
    const geojson = layer.toGeoJSON();
    // Menangani Polygon dan MultiPolygon
    const coords = geojson.geometry.type === 'Polygon' 
        ? geojson.geometry.coordinates[0] 
        : geojson.geometry.coordinates[0][0];

    // Konversi dari [lng, lat] ke objek L.latLng
    drawnCoordinates = coords.map(p => L.latLng(p[1], p[0]));
}


function generateSigmetText() {
    const seq = document.getElementById('sigmet-seq').value.padStart(2, '0') || 'XX';
    const phenomenon = phenomenonSelect.value;
    const startTimeStr = startTimeInput.value;
    const endTimeStr = endTimeInput.value;
    
    const validPeriod = `${startTimeStr}/${endTimeStr}`;
    const obsTime = document.getElementById('sigmet-obs-time').value || '';
    const level = document.getElementById('sigmet-level').value.toUpperCase() || 'FLXXX/XXX';
    const movement = document.getElementById('sigmet-movement').value.toUpperCase() || 'STNR';
    const change = document.getElementById('sigmet-change').value.toUpperCase() || 'NC=';
    const now = new Date();
    const issueTime = `${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}`;
    
    let sigmetText = `WSID21 WAAA ${issueTime}\nWAAF SIGMET ${seq} VALID ${validPeriod} WAAA-\nWAAF UJUNG PANDANG FIR SEV TURB ${phenomenon}`;
    
    if (phenomenon === 'OBS' && obsTime) {
        sigmetText += ` AT ${obsTime}Z`;
    }
    
    // === LOGIKA INTI YANG BARU ===
    if (drawnCoordinates && drawnCoordinates.length > 0) {
        let coordinateString = "";
        
        // Cek apakah jumlah titik > 7 ATAU flag isSimplified aktif
        if (drawnCoordinates.length > 7 || isSimplified) {
            // --- Logika untuk format deskriptif ---
            const turfPolygon = turf.polygon([drawnCoordinates.map(p => [p.lng, p.lat])]);
            const bbox = turf.bbox(turfPolygon); // -> [minLon, minLat, maxLon, maxLat]
            const [minLon, minLat, maxLon, maxLat] = bbox;

            const descriptions = [
                `N OF ${formatCoordinate(minLat, 0).split(' ')[0]}`,
                `S OF ${formatCoordinate(maxLat, 0).split(' ')[0]}`,
                `E OF ${formatCoordinate(0, minLon).split(' ')[1]}`,
                `W OF ${formatCoordinate(0, maxLon).split(' ')[1]}`
            ];
            coordinateString = descriptions.join(' AND ');

        } else {
            // --- Logika lama untuk format daftar koordinat ---
            const coordList = drawnCoordinates.map(latlng => formatCoordinate(latlng.lat, latlng.lng));
            coordinateString = `${coordList.join(' - ')} - ${coordList[0]}`;
        }
        
        sigmetText += ` WI ${coordinateString}`;
    }
    
    sigmetText += `\n${level} ${movement} ${change}`;
    sigmetOutput.value = sigmetText;
}


function formatCoordinate(lat, lng) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lng >= 0 ? 'E' : 'W';
    
    const latAbs = Math.abs(lat);
    const latDeg = Math.floor(latAbs);
    const latMin = Math.round((latAbs - latDeg) * 60);
    
    const lonAbs = Math.abs(lng);
    const lonDeg = Math.floor(lonAbs);
    const lonMin = Math.round((lonAbs - lonDeg) * 60);
    
    const latStr = `${latDir}${String(latDeg).padStart(2, '0')}${String(latMin).padStart(2, '0')}`;
    const lonStr = `${lonDir}${String(lonDeg).padStart(3, '0')}${String(lonMin).padStart(2, '0')}`;
    
    return `${latStr} ${lonStr}`;
}

// 4. Logika untuk menampilkan/menyembunyikan panel (tidak berubah)
const turbulenceLayerGroup = L.layerGroup();
map.on('overlayadd', (e) => {
    if (e.layer === turbulenceLayerGroup) {
        createLayersForFlightLevel(flSelector.value);
        flSelectorContainer.classList.remove('hidden');
        document.getElementById('turbulence-legend').classList.remove('hidden');
        sliderContainer.classList.remove('hidden');
        updateMapAndUI(0);
        map.attributionControl.addAttribution('EDR data © World Area Forecast System');
        sigmetToolPanel.classList.remove('hidden');
    }
});

map.on('overlayremove', (e) => {
    if (e.layer === turbulenceLayerGroup) {
        flSelectorContainer.classList.add('hidden');
        document.getElementById('turbulence-legend').classList.add('hidden');
        sliderContainer.classList.add('hidden');
        if (currentTurbulenceLayer) {
            map.removeLayer(currentTurbulenceLayer);
            currentTurbulenceLayer = null;
        }
        map.attributionControl.removeAttribution('EDR data © World Area Forecast System');
        sigmetToolPanel.classList.add('hidden');
        clearDrawBtn.click();
    }
});



var vaAdvisoryLayer = L.layerGroup();
        var baseMaps = {
            "Peta CartoDB": cartoPositron,
			"Peta OSM": osmLayer,
            "Peta Esri Imagery": esriImagery,
            "Peta Topografi": topoMap,
            "Peta Tutupan Lahan": lulcMap
        };
        var overlayMaps = {
			"Prakiraan Cuaca": weatherForecastLayer,
	    "Turbulence (EDR)": turbulenceLayerGroup,
            "Satelit Visible": VISsatelliteLayer,
            "Satelit Inframerah": IRsatelliteLayer,
	    "Satelit Uap Air": WVsatelliteLayer,
	     "Radar Cuaca": radarLayer,
            "Cuaca Bandara": airportLayer,
	    "Tropical Waves": TropicalLayer,
	     "VA Advisory": vaAdvisoryLayer
        };
        setTimeout(() => {
            let layerControl = document.querySelector('.leaflet-control-layers');
            if (layerControl) {
                layerControl.style.marginBottom = "150px";
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
// =======================================================================
// === FITUR NOTIFIKASI VA ADVISORY DENGAN INTEGRASI PETA (VERSI LENGKAP) ===
// =======================================================================

// --- Deklarasi Variabel Global ---
var vaAdvisoryLayer = L.layerGroup();
let vaaCheckerInterval = null;
let lastAdvisoryData = null;
let isFirstCheck = true;
const vaacApiUrl = '/api/check-vaac';
const debugStatusElement = document.getElementById('va-debug-status');

// --- Fungsi Helper ---

/**
 * 1. Mengambil data VAA paling baru dari API backend.
 */
async function fetchLatestVAA() {
    updateDebugStatus('Mengambil data VAA...');
    try {
        const response = await fetch(`${vaacApiUrl}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const data = await response.json();
        if (!data || data.error) throw new Error(data ? data.error : 'Data VAA tidak valid');
        return data;
    } catch (error) {
        console.error('[VAA] Gagal mengambil data:', error);
        updateDebugStatus(`Error: ${error.message}`, true);
        return null;
    }
}

/**
 * 2. Mengurai teks VAA untuk info peta (nama & posisi gunung).
 */
/**
 * 2. Mengurai teks VAA untuk info peta (nama & posisi gunung). (VERSI DIPERBAIKI)
 */
function parseVaaForMapInfo(vaaFullText) {
    // Bersihkan teks dari karakter carriage return (\r)
    const cleanText = vaaFullText.replace(/\r/g, '');

    try {
        const volcanoMatch = cleanText.match(/VOLCANO:\s*([\w\s-]+?)\s+\d+/i);
        
        // Regex ini sekarang lebih toleran terhadap spasi antara bagian-bagian PSN
        const psnMatch = cleanText.match(/PSN:\s*(S|N)(\d{2})(\d{2})\s*(E|W)(\d{3})(\d{2})/i);

        if (!volcanoMatch || !psnMatch) {
            console.error("[Map Info Parser] Gagal mem-parsing nama atau posisi gunung dari teks VAA.");
            return null;
        }

        const volcanoName = volcanoMatch[1].trim();
        
        // Konversi koordinat dari format Derajat-Menit ke Desimal (logika ini tetap sama)
        const [, latDir, latDeg, latMin, lonDir, lonDeg, lonMin] = psnMatch;
        let lat = parseInt(latDeg) + (parseInt(latMin) / 60);
        if (latDir.toUpperCase() === 'S') lat = -lat;
        let lon = parseInt(lonDeg) + (parseInt(lonMin) / 60);
        if (lonDir.toUpperCase() === 'W') lon = -lon;
        
        return { 
            volcanoName: volcanoName, 
            lat: lat.toFixed(4),
            lon: lon.toFixed(4) 
        };
    } catch (error) {
        console.error("[Map Info Parser] Error saat parsing VAA untuk info peta:", error);
        return null;
    }
}

    /**
 * 3. Membuat string SIGMET WV dari teks VAA.
 */
function generateSigmet(vaaFullText) {
    // Bersihkan teks dari karakter carriage return (\r) yang sering jadi masalah
    const cleanText = vaaFullText.replace(/\r/g, '');

    try {
        const extract = (regex) => (cleanText.match(regex) || [])[1]?.trim() || null;
        const extractGroup = (regex) => (cleanText.match(regex) || []);

        // --- Bagian 1: Ekstraksi Informasi Umum (Tidak berubah) ---
        const headerMatch = extractGroup(/FVAU\d{2}\s*ADRM\s*(\d{2})(\d{2})(\d{2})/i);
        const headerDay = headerMatch[1] || null;
        const headerHHMM = headerMatch[2] && headerMatch[3] ? `${headerMatch[2]}${headerMatch[3]}` : null;
        const publicationTime = headerDay && headerHHMM ? `${headerDay}${headerHHMM}` : null;
        const validStartTime = publicationTime;

        const nxtAdvisoryMatch = extractGroup(/NXT ADVISORY:[\s\S]*?(\d{2})?\/?(\d{4,6}Z)/i);
        const nxtDay = nxtAdvisoryMatch[1] || headerDay; 
        const nxtTime = nxtAdvisoryMatch[2]?.match(/(\d{4})Z/)?.[1] || null;
        const validEndTime = nxtDay && nxtTime ? `${nxtDay}${nxtTime}` : null;
        
        const volcano = extract(/VOLCANO:\s*([\w\s-]+?)\s+\d+/i);
        const position = extract(/PSN:\s*([NS]\d{4}\s*E\d{5})/i);
        const obsTime = extract(/(?:OBS|EST)\s*VA\s*DTG:\s*\d{2}\/(\d{4}Z)/i);

        if (!publicationTime || !validStartTime || !validEndTime || !volcano || !position || !obsTime) {
            console.error("[SIGMET Generator] Gagal parsing informasi umum.");
            return "Error: Gagal mem-parsing header atau informasi umum VAA.";
        }

        // --- Bagian 2: Logika Parsing Multipoligon (Tidak berubah, sudah solid) ---
        const ashCloudBlockMatch = cleanText.match(/(?:OBS|EST) VA CLD:([\s\S]*?)(?=FCST VA CLD|RMK:|NXT ADVISORY:)/i);
        if (!ashCloudBlockMatch) {
            return "Error: Tidak dapat menemukan blok 'EST VA CLD' pada VAA.";
        }
        
        const ashCloudBlock = ashCloudBlockMatch[1];
        const cloudChunks = ashCloudBlock.split(/SFC\/FL/).filter(chunk => chunk.trim() !== '');

        if (cloudChunks.length === 0) {
            return "Error: Blok 'EST VA CLD' ditemukan, tetapi tidak ada deskripsi awan abu (SFC/FL).";
        }
        
        const parsedClouds = cloudChunks.map(chunk => {
            const chunkContent = chunk.trim();
            const movParts = chunkContent.split(/\s+MOV\s+/i);
            const flAndCoordsPart = movParts[0].trim();
            const movementStr = movParts.length > 1 ? `MOV ${movParts.slice(1).join(' MOV ')}`.trim() : 'STNR';
            const flMatch = flAndCoordsPart.match(/^(\d{3})\s*/);
            if (!flMatch) return null;
            const flightLevel = flMatch[1];
            let coords = flAndCoordsPart.substring(flMatch[0].length).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            const firstCoord = coords.split(' - ')[0];
            if (firstCoord && !coords.endsWith(firstCoord)) {
                coords += ` - ${firstCoord}`;
            }
            return { flightLevel, coords, movementStr };
        }).filter(Boolean);

        if (parsedClouds.length === 0) {
            return "Error: Gagal mem-parsing detail awan abu dari blok 'EST VA CLD'.";
        }
        
        // --- Bagian 3: Merakit String SIGMET dengan Logika INTENSITY yang Benar ---
        const sigmetHeader = `WVID21 WAAA ${publicationTime}\nWAAF SIGMET XX VALID ${validStartTime}/${validEndTime} WAAA-\nWAAF UJUNG PANDANG FIR VA ERUPTION MT ${volcano} PSN ${position}\n`;

        // Rakit deskripsi fenomena dengan logika baru
        const phenomenonDescription = parsedClouds.map((cloud, index) => {
            const prefix = (index === 0) 
                ? `VA CLD OBS AT ${obsTime} WI ` 
                : `AND OBS AT ${obsTime} WI `;

            // Bangun segmen lengkap untuk satu awan abu
            const segment = `${prefix}${cloud.coords}\nSFC/FL${cloud.flightLevel} ${cloud.movementStr}`;
            
            // Tambahkan "NC" setelah setiap segmen.
            // Jika ini segmen terakhir, tambahkan "=" setelah "NC".
            if (index === parsedClouds.length - 1) {
                return `${segment} NC=`; // Untuk segmen terakhir
            } else {
                return `${segment} NC`; // Untuk semua segmen lainnya
            }
        }).join(' '); // Gabungkan semua segmen yang telah jadi dengan spasi

        // Gabungkan header dengan deskripsi yang sudah final
        return `${sigmetHeader}${phenomenonDescription}`;

    } catch (error) {
        console.error("[SIGMET Generator] Terjadi error internal:", error);
        return `Terjadi error internal saat membuat SIGMET.\n\nDetail: ${error.message}`;
    }
}
/**
 * 4. Fungsi utama untuk menampilkan notifikasi di peta.
 * (VERSI FINAL LENGKAP)
 */
function showVaaNotificationOnMap(vaaData) {
    // Verifikasi data yang diterima dari backend untuk debugging
    console.log("[VAA] Data diterima oleh Frontend");

    const mapInfo = parseVaaForMapInfo(vaaData.fullText);
    if (!mapInfo) {
        alert("Gagal memproses lokasi gunung dari VAA terbaru. Cek console untuk detail.");
        return;
    }

    // Bersihkan notifikasi lama dan siapkan elemen
    vaAdvisoryLayer.clearLayers();
    const alertSound = document.getElementById('vaa-alert-sound');
    const volcanoIcon = L.divIcon({ className: 'blinking-volcano-marker', iconSize: [24, 24], iconAnchor: [12, 22] });
    const volcanoMarker = L.marker([mapInfo.lat, mapInfo.lon], { icon: volcanoIcon });
    
    // --- MEMBANGUN KONTEN POP-UP SECARA DINAMIS ---
    
    // 1. Buat container utama untuk semua konten di dalam pop-up
    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = `<b>🚨 VA Advisory Baru! 🚨</b><br><b>Gunung:</b> ${mapInfo.volcanoName}<br><b>Posisi:</b> ${mapInfo.lat}, ${mapInfo.lon}`;
    
    // 2. Buat container untuk tombol-tombol aksi
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'vaa-popup-buttons';
    
    // Tombol "Unduh" gabungan
    const downloadBtn = document.createElement('button');
    downloadBtn.innerText = vaaData.imageBase64 ? 'Unduh (Txt+Png)' : 'Unduh (.txt)';
    buttonContainer.appendChild(downloadBtn);

    // Tombol "Buat SIGMET"
    const generateSigmetBtn = document.createElement('button');
    generateSigmetBtn.innerText = 'Buat SIGMET';
    generateSigmetBtn.className = 'sigmet-btn';
    buttonContainer.appendChild(generateSigmetBtn);
    
    // 3. Atur logika onclick untuk tombol "Unduh"
    downloadBtn.onclick = function() {
        console.log("[VAA] Tombol Unduh Gabungan diklik.");
        
        // Aksi 1: Selalu unduh file .txt
        try {
            const blob = new Blob([vaaData.fullText], { type: 'text/plain' });
            const txtUrl = URL.createObjectURL(blob);
            const txtLink = document.createElement('a');
            txtLink.href = txtUrl;
            txtLink.download = `VAA_${vaaData.advisoryNumber}.txt`;
            txtLink.click();
            URL.revokeObjectURL(txtUrl);
        } catch (e) {
            console.error("[VAA] Gagal mengunduh file TXT:", e);
        }

        // Aksi 2: Jika ada data Base64, unduh juga file .png
        if (vaaData.imageBase64) {
            setTimeout(() => {
                try {
                    const pngLink = document.createElement('a');
                    pngLink.href = vaaData.imageBase64;
                    pngLink.download = `VAA_MAP_${vaaData.advisoryNumber}.png`;
                    pngLink.click();
                } catch (e) {
                    console.error("[VAA] Gagal mengunduh file PNG dari Base64:", e);
                }
            }, 100);
        }
    };
    
    // 4. Buat container untuk output SIGMET (awalnya tersembunyi)
    const sigmetContainer = document.createElement('div');
    sigmetContainer.className = 'sigmet-output-container';
    sigmetContainer.style.display = 'none';
    sigmetContainer.innerHTML = `<textarea readonly rows="8"></textarea><button>Salin Teks SIGMET</button>`;

    // 5. Atur logika onclick untuk tombol "Buat SIGMET"
    generateSigmetBtn.onclick = () => {
        const sigmetText = generateSigmet(vaaData.fullText);
        const textarea = sigmetContainer.querySelector('textarea');
        textarea.value = sigmetText;
        sigmetContainer.style.display = 'block';
        generateSigmetBtn.style.display = 'none';
        volcanoMarker.getPopup().update();
    };
    
    // 6. Atur logika onclick untuk tombol "Salin Teks SIGMET"
    sigmetContainer.querySelector('button').onclick = () => {
        const textarea = sigmetContainer.querySelector('textarea');
        navigator.clipboard.writeText(textarea.value).then(() => {
            const btn = sigmetContainer.querySelector('button');
            btn.innerText = 'Tersalin!';
            setTimeout(() => { btn.innerText = 'Salin Teks SIGMET'; }, 2000);
        });
    };

    // 7. Gabungkan semua elemen ke dalam container pop-up utama
    popupContainer.appendChild(buttonContainer);
    popupContainer.appendChild(sigmetContainer);

    // --- SELESAI MEMBUAT KONTEN POP-UP ---

    // 8. Ikat pop-up ke marker, tampilkan, dan mulai alarm
    volcanoMarker.bindPopup(popupContainer, { minWidth: 280 });
    vaAdvisoryLayer.addLayer(volcanoMarker);
    vaAdvisoryLayer.addTo(map);

    map.panTo([mapInfo.lat, mapInfo.lon]);
    volcanoMarker.openPopup();
    if (alertSound) {
        alertSound.play().catch(e => console.warn("[VAA] Autoplay suara diblokir oleh browser.", e));
    }

    // 9. Atur event saat pop-up ditutup untuk menghentikan alarm
    volcanoMarker.on('popupclose', () => {
        console.log("[VAA] Pop-up ditutup, alarm dihentikan.");
        if (alertSound) {
            alertSound.pause();
            alertSound.currentTime = 0;
        }
        vaAdvisoryLayer.clearLayers();
    });
}
/**
 * 5. Fungsi Pengecek Utama yang berjalan periodik.
 */
async function checkForNewVAA() {
    const data = await fetchLatestVAA();
    if (!data || !data.advisoryNumber) {
        const errorMsg = 'Data VAA tidak lengkap atau gagal diambil.';
        console.error(`[VAA] ${errorMsg}`);
        updateDebugStatus(errorMsg, true);
        return;
    }
    if (isFirstCheck) {
        lastAdvisoryData = data;
        isFirstCheck = false;
        const logMsg = `Pengecekan awal OK. Advisory saat ini: #${lastAdvisoryData.advisoryNumber}`;
        console.log(`[VAA] ${logMsg}`);
        updateDebugStatus(logMsg);
        return;
    }
    if (data.advisoryNumber !== lastAdvisoryData.advisoryNumber) {
        const logMsg = `BARU: Advisory #${data.advisoryNumber} terdeteksi!`;
        console.log(`[VAA] ${logMsg}`);
        updateDebugStatus(logMsg);
        lastAdvisoryData = data;
        showVaaNotificationOnMap(data);
    } else {
        const logMsg = `Status OK. Masih di advisory #${lastAdvisoryData.advisoryNumber}`;
        console.log(`[VAA] ${logMsg}`);
        updateDebugStatus(logMsg);
    }
}

// --- Event Listeners & Helper ---

document.addEventListener('DOMContentLoaded', function() {
    map.on('overlayadd', function(e) {
        if (e.name === 'VA Advisory') {
            if (debugStatusElement) debugStatusElement.classList.add('visible');
            updateDebugStatus('VA Advisory Notifier Aktif...');
            isFirstCheck = true;
            checkForNewVAA();
            if (vaaCheckerInterval) clearInterval(vaaCheckerInterval);
            vaaCheckerInterval = setInterval(checkForNewVAA, 10000);
        }
    });

    map.on('overlayremove', function(e) {
        if (e.name === 'VA Advisory') {
            if (debugStatusElement) debugStatusElement.classList.remove('visible');
            clearInterval(vaaCheckerInterval);
            vaaCheckerInterval = null;
            vaAdvisoryLayer.clearLayers();
            const alertSound = document.getElementById('vaa-alert-sound');
            if (alertSound) { alertSound.pause(); alertSound.currentTime = 0; }
            console.log("[VAA] Notifier dinonaktifkan.");
        }
    });
});

function updateDebugStatus(message, isError = false) {
    if (debugStatusElement) {
        debugStatusElement.textContent = message;
        debugStatusElement.style.color = isError ? '#ff6b6b' : '#a7ff83';
    }
}
// ========================= AKHIR KODE VAA =========================

