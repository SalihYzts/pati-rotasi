// Sisli haritanın WebView / iframe içinde çalışan Leaflet sayfası.
// Uygulama, sayfaya window.patiUpdate(data) ile veri gönderir; sayfa kedi
// işaretine dokunulunca {type:'cat', id} mesajı yollar.

export interface FogMapData {
  center: { lat: number; lng: number };
  position: { lat: number; lng: number } | null;
  cells: [number, number][]; // açılmış hücre merkezleri
  track: [number, number][];
  cats: { id: string; lat: number; lng: number; color: string }[];
  follow: boolean;
  recenter?: number; // değiştikçe haritayı konuma ortalar
}

export const FOG_MAP_HTML = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H" crossorigin="anonymous" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH" crossorigin="anonymous"></script>
<style>
  html,body,#map{margin:0;height:100%;width:100%;background:#F4EADB;}
    .leaflet-tile-pane{filter:sepia(.28) saturate(.85) brightness(1.03);}
  #fog{position:absolute;inset:0;z-index:450;pointer-events:none;}
  .leaflet-control-attribution{font-size:9px;background:rgba(255,244,230,.8)!important;}
  .me{width:18px;height:18px;border-radius:50%;background:#E8743B;border:3px solid #fff;box-shadow:0 0 0 0 rgba(232,116,59,.6);animation:pulse 1.8s infinite;}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(232,116,59,.55)}70%{box-shadow:0 0 0 18px rgba(232,116,59,0)}100%{box-shadow:0 0 0 0 rgba(232,116,59,0)}}
  .cat{width:30px;height:30px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 3px 8px rgba(43,33,64,.35);}
  .leaflet-marker-pane{z-index:600;} .leaflet-overlay-pane{z-index:460;}
</style>
</head><body>
<div id="map"></div>
<canvas id="fog"></canvas>
<script>
(function(){
  var send = function(msg){
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  };
  var map = L.map('map', { zoomControl:false, zoomAnimation:false, attributionControl:true }).setView([40.9862, 29.0262], 16);
  // OpenStreetMap karoları (anahtar gerektirmez). Yayına çıkarken kendi karo sağlayıcınıza geçin.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var canvas = document.getElementById('fog');
  var ctx = canvas.getContext('2d');

  // Bulut dokusu: bir kere çizilip desen olarak tekrar eder.
  var tex = document.createElement('canvas'); tex.width = tex.height = 256;
  (function(){
    var t = tex.getContext('2d');
    t.fillStyle = '#F6EEE3'; t.fillRect(0,0,256,256);
    var seed = 7; function rnd(){ seed = (seed*9301+49297)%233280; return seed/233280; }
    for (var i=0;i<70;i++){
      var x=rnd()*256, y=rnd()*256, r=14+rnd()*40;
      for (var dx=-256; dx<=256; dx+=256) for (var dy=-256; dy<=256; dy+=256){
        var g=t.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);
        g.addColorStop(0,'rgba(255,255,255,'+(0.35+rnd()*0.3)+')'); g.addColorStop(1,'rgba(255,255,255,0)');
        t.fillStyle=g; t.beginPath(); t.arc(x+dx,y+dy,r,0,Math.PI*2); t.fill();
      }
    }
    for (var k=0;k<40;k++){
      t.fillStyle='rgba(200,180,160,0.08)';
      t.beginPath(); t.arc(rnd()*256,rnd()*256,2+rnd()*3,0,Math.PI*2); t.fill();
    }
  })();
  var pattern = ctx.createPattern(tex, 'repeat');

  var data = { cells: [], track: [], cats: [], position: null, follow: false };
  var meMarker = null, trackLine = null, catLayer = L.layerGroup().addTo(map);
  var lastRecenter = null, firstUpdate = true;

  function resize(){
    var r = window.devicePixelRatio || 1;
    var s = map.getSize();
    canvas.width = s.x * r; canvas.height = s.y * r;
    canvas.style.width = s.x + 'px'; canvas.style.height = s.y + 'px';
    ctx.setTransform(r,0,0,r,0,0);
    draw();
  }

  function draw(){
    var s = map.getSize();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0,0,s.x,s.y);
    var origin = map.getPixelOrigin(), pane = map._getMapPanePos ? map._getMapPanePos() : {x:0,y:0};
    ctx.save();
    ctx.translate(-(origin.x - pane.x) % 256 - 256, -(origin.y - pane.y) % 256 - 256);
    ctx.fillStyle = pattern; ctx.globalAlpha = 0.94;
    ctx.fillRect(0,0,s.x+512,s.y+512);
    ctx.restore();
    ctx.globalAlpha = 1;

    var c = map.getCenter();
    var mpp = 40075016.686 * Math.cos(c.lat*Math.PI/180) / Math.pow(2, map.getZoom()+8);
    var rad = Math.max(6, 48 / mpp);
    ctx.globalCompositeOperation = 'destination-out';
    var b = map.getBounds().pad(0.3);
    for (var i=0;i<data.cells.length;i++){
      var ll = data.cells[i];
      if (!b.contains(ll)) continue;
      var p = map.latLngToContainerPoint(ll);
      var g = ctx.createRadialGradient(p.x,p.y,rad*0.35,p.x,p.y,rad);
      g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,rad,0,Math.PI*2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  map.on('move zoom viewreset', draw);
  map.on('resize', resize);
  window.addEventListener('resize', function(){ map.invalidateSize(); resize(); });

  window.patiUpdate = function(d){
    data = d;
    if (firstUpdate) { map.setView([d.center.lat, d.center.lng], 17); firstUpdate = false; }
    if (d.recenter !== undefined && d.recenter !== lastRecenter) {
      lastRecenter = d.recenter;
      if (d.position) map.setView([d.position.lat, d.position.lng], Math.max(map.getZoom(), 16));
    }
    if (d.position) {
      var ll = [d.position.lat, d.position.lng];
      if (!meMarker) meMarker = L.marker(ll, { icon: L.divIcon({ className:'', html:'<div class="me"></div>', iconSize:[18,18], iconAnchor:[9,9] }), interactive:false }).addTo(map);
      else meMarker.setLatLng(ll);
      if (d.follow) map.panTo(ll, { animate: true, duration: 0.5 });
    }
    if (trackLine) map.removeLayer(trackLine);
    if (d.track.length > 1) trackLine = L.polyline(d.track, { color:'#E8743B', weight:4, opacity:.85, dashArray:'2 8', lineCap:'round' }).addTo(map);
    catLayer.clearLayers();
    d.cats.forEach(function(cat){
      var m = L.marker([cat.lat, cat.lng], { icon: L.divIcon({ className:'', html:'<div class="cat" style="background:'+cat.color+'">🐾</div>', iconSize:[30,30], iconAnchor:[15,15] }) });
      m.on('click', function(){ send({ type:'cat', id: cat.id }); });
      catLayer.addLayer(m);
    });
    draw();
  };

  window.addEventListener('message', function(e){
    try { var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if (d && d.type === 'update') window.patiUpdate(d.data); } catch(_){}
  });

  resize();
  send({ type: 'ready' });
})();
</script>
</body></html>`;
