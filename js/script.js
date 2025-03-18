var map = L.map('map', { center: [-2.5, 118], zoom: 5, attributionControl: false });
        L.control.attribution({ position: 'bottomright' }).addAttribution('Proposed by <a href="https://mail.google.com/mail/?view=cm&fs=1&to=prayoga.ismail@bmkg.go.id" target="_blank">Prayoga Ismail</a>, Coding by OpenAI').addTo(map);
        document.getElementById("legend").style.display = "none";
        map.on("overlayadd", function (eventLayer) {
            if (eventLayer.name === "Radar Cuaca") document.getElementById("legend").style.display = "block";
        });
        map.on("overlayremove", function (eventLayer) {
            if (eventLayer.name === "Radar Cuaca") document.getElementById("legend").style.display = "none";
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
        var lulcMap = L.tileLayer.wms("https://services.terrascope.be/wms/v2", { layers: 'WORLDCOVER_2020_MAP', format: 'image/png', transparent: true, attribution: 'Base map &copy; ESA WorldCover 2020' });
        var radarLayer = L.tileLayer('', { opacity: 0.8, attribution: 'Radar data &copy; RainViewer' });
        var IRsatelliteLayer = L.tileLayer('', { opacity: 0.6, attribution: 'Satellite data &copy; RainViewer' });
        var precipitationLayer = L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=62ac6e2d12bbaaa3de6bf9f57fe1cc00', { attribution: 'Precipitation data &copy; OpenWeatherMap', opacity: 1 });
        var pressureLayer = L.tileLayer('https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=62ac6e2d12bbaaa3de6bf9f57fe1cc00', { attribution: 'Pressure data &copy; OpenWeatherMap', opacity: 1 });
        function addUserLocation() {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        let userLat = position.coords.latitude;
                        let userLng = position.coords.longitude;
                        map.setView([userLat, userLng], 8);
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
                let radarUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/2/1_1.png`;
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
        function updateIRSatellite(timeOffset = 0) {
            fetch('https://api.rainviewer.com/public/weather-maps.json')
                .then(response => response.json())
                .then(data => {
                    if (data.satellite && data.satellite.infrared.length > 0) {
                        let index = Math.max(0, data.satellite.infrared.length - 1 - timeOffset);
                        let timestamp = data.satellite.infrared[index].time;
                        let path = data.satellite.infrared[index].path;
                        let satelliteUrl = `https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/0/0_0.png`;
                        IRsatelliteLayer.setUrl(satelliteUrl);
                    } else {
                        console.error("Data satelit tidak tersedia.");
                    }
                })
                .catch(error => console.error("Gagal mengambil data satelit:", error));
        }
        updateRadar();
        updateIRSatellite();
        setInterval(updateRadar, 300000);
        setInterval(updateIRSatellite, 300000);
	    
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
    return map.hasLayer(radarLayer) || map.hasLayer(IRsatelliteLayer);
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
        var userMarker;
        var weatherChart;
        var chartPopup = document.getElementById('chart-popup');
        var closePopup = document.getElementById('close-popup');
        var downloadCSV = document.getElementById('download-csv');
        var downloadImg = document.getElementById('download-img');
        var currentData = {};
        function fetchWeatherData(lat, lon) {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&forecast_days=3&models=ecmwf_ifs025&timezone=auto`)
                .then(response => response.json())
                .then(data => {
                    let hourly = data.hourly;
                    let times = [];
                    let precipitation = [];
                    let windSpeed = [];
                    let windDirection = [];
                    for (let i = 0; i < hourly.time.length; i += 1) {
                        times.push(hourly.time[i].substring(11, 16));
                        precipitation.push(hourly.precipitation[i]);
                        windSpeed.push(hourly.wind_speed_10m[i]);
                        windDirection.push(hourly.wind_direction_10m[i]);
                    }
                    currentData = { times, precipitation, windSpeed, windDirection };
                    if (marker) map.removeLayer(marker);
                    if (userMarker) {
                        map.removeLayer(userMarker);
                        userMarker = null;
                    }
                    marker = L.marker([lat, lon]).addTo(map)
                        .bindPopup("Klik untuk lihat prakiraan cuaca.")
                        .openPopup()
                        .on('click', function() { showChart(times, precipitation, windSpeed, windDirection); });
                })
                .catch(error => console.error('Gagal mengambil data:', error));
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
                        title: { display: false, text: ' ' },
                        subtitle: {
                            display: true,
                            text: 'Prakiraan cuaca oleh Open-Meteo. Sumber data: IFS 0.25, ECMWF.',
                            align: 'center',
                            font: { size: 12, weight: 'bold' },
                            padding: { bottom: 5 }
                        }
                    }
                }
            });
        }
        function downloadCSVFile() {
            let csvContent = "data:text/csv;charset=utf-8,Waktu Setempat,Curah Hujan (mm),Kecepatan Angin (knot),Arah Angin (°)\n";
            currentData.times.forEach((time, index) => {
                let formattedTime = time.replace("T", " ") + ":00";
                csvContent += `${formattedTime},${currentData.precipitation[index]},${currentData.windSpeed[index]},${currentData.windDirection[index]}\n`;
            });
            let encodedUri = encodeURI(csvContent);
            let link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "Prakiraan_Cuaca.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        function downloadImage() {
            let canvas = document.getElementById('weatherChart');
            let ctx = canvas.getContext('2d');
            let newCanvas = document.createElement('canvas');
            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height;
            let newCtx = newCanvas.getContext('2d');
            newCtx.fillStyle = 'white';
            newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            newCtx.drawImage(canvas, 0, 0);
            let link = document.createElement('a');
            link.href = newCanvas.toDataURL('image/png');
            link.download = 'Prakiraan_Cuaca.png';
            link.click();
        }
        downloadCSV.addEventListener('click', downloadCSVFile);
        downloadImg.addEventListener('click', downloadImage);
        closePopup.addEventListener('click', function() { chartPopup.style.display = 'none'; });
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    let userLat = position.coords.latitude;
                    let userLon = position.coords.longitude;
                    map.setView([userLat, userLon], 12);
                    if (userMarker) map.removeLayer(userMarker);
                    userMarker = L.marker([userLat, userLon]).addTo(map)
                        .bindPopup("Lokasi Anda").openPopup();
                    fetchWeatherData(userLat, userLon);
                },
                function() { console.log("Tidak dapat mengambil lokasi pengguna."); }
            );
        }
        map.on('click', function(e) {
            if (marker) map.removeLayer(marker);
            if (userMarker) {
                map.removeLayer(userMarker);
                userMarker = null;
            }
            let lat = e.latlng.lat;
            let lon = e.latlng.lng;
            fetchWeatherData(lat, lon);
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
            { code: "WIPP", name: "Sultan Mahmud Badaruddin II", lat: -2.8949, lon: 104.70679 }
        ];
        var airportLayer = L.layerGroup();
        var markers = {};
        airports.forEach(airport => {
            var marker = L.circleMarker([airport.lat, airport.lon], {
                radius: 7,
                color: "black",
                fillColor: "white",
                fillOpacity: 0.1
            }).bindPopup(`<b>${airport.name} (${airport.code})</b><br>Memuat data METAR...`);
            markers[airport.code] = marker;
            airportLayer.addLayer(marker);
        });
        var icaoCodes = airports.map(a => a.code).join("%2C");
        var apiUrl = `https://api.met.no/weatherapi/tafmetar/1.0/metar.txt?icao=${icaoCodes}`;
        fetch(apiUrl, { headers: { 'User-Agent': 'Prayoga Ismail/yogamailforalvin@gmail.com' } })
            .then(response => {
                if (!response.ok) throw new Error("Gagal mengambil data METAR");
                return response.text();
            })
            .then(text => {
                var metarEntries = text.split("\n");
                var metarData = {};
                metarEntries.forEach(entry => {
                    if (entry.trim() === "") return;
                    var parts = entry.split(" ");
                    var icaoCode = parts[0];
                    if (!metarData[icaoCode]) metarData[icaoCode] = [];
                    metarData[icaoCode].push(entry);
                });
                airports.forEach(airport => {
                    if (metarData[airport.code]) {
                        markers[airport.code].bindPopup(
                            `<b>${airport.name} (${airport.code})</b><br>${metarData[airport.code]
                                .slice(-6)
                                .map(entry => "METAR " + entry)
                                .join('<br>')}`);
                    }
                });
            })
            .catch(error => {
                console.error("Gagal mengambil data METAR", error);
                alert("Terjadi kesalahan dalam mengambil data METAR");
            });
        var baseMaps = {
            "Peta OSM": osmLayer,
            "Peta Esri Imagery": esriImagery,
            "Peta CartoDB": cartoPositron,
            "Peta Topografi": topoMap,
            "Peta Tutupan Lahan": lulcMap
        };
        var overlayMaps = {
            "Tekanan Udara (OWM)": pressureLayer,
            "Satelit Inframerah": IRsatelliteLayer,
            "Sebaran hujan (OWM)": precipitationLayer,
            "Radar Cuaca": radarLayer,
            "Cuaca Bandara": airportLayer
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
