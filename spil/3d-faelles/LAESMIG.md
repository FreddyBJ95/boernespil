# Fælles 3D-motor til de tre voksenverdener

Three.js r160 og GLTFLoader bruges lokalt, så spillene ikke behøver at hente kode fra et CDN.
Biblioteket er udgivet under MIT; den oprindelige tilladelse ligger i `LICENSE-three.txt`.

Kilderne er fra npm-pakken `three@0.160.0`:

- `build/three.module.js`
- `examples/jsm/loaders/GLTFLoader.js`
- `examples/jsm/utils/BufferGeometryUtils.js`

De eneste ændringer i bibliotekets kode er lokale importstier: `three` peger på `./three.module.js`,
og GLTFLoader henter `./BufferGeometryUtils.js`. Spillene er rene ES-moduler uden et byggetrin.
