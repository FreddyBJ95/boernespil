// En lille erstatning for three.js, så bane.js kan køres i Node (uden browser) og banen kan gemmes til Blender.
// Kun geometrien gemmes rigtigt — alt andet (materialer, cylindre, grupper) er tomme skaller.

export class Float32BufferAttribute {
  constructor(liste, str) { this.array = Float32Array.from(liste); this.itemSize = str; this.count = this.array.length / str; }
  getY(i) { return this.array[i * this.itemSize + 1]; }
  setZ(i, v) { this.array[i * this.itemSize + 2] = v; }
}
export class BufferGeometry {
  constructor() { this.attributes = {}; this.index = null; }
  setAttribute(navn, a) { this.attributes[navn] = a; return this; }
  setIndex(liste) { this.index = Uint32Array.from(liste); return this; }
  translate() { return this; }
  computeVertexNormals() {}
}
const vektor = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
class Ting {
  constructor(...a) { this.args = a; this.position = vektor(); this.rotation = vektor(); this.children = []; this.attributes = { position: { count: 0 } }; }
  add(...b) { this.children.push(...b); return this; }
  translate() { return this; }
  computeVertexNormals() {}
}
export class Mesh extends Ting { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
export class Group extends Ting {}
export class MeshStandardMaterial extends Ting {}
export class MeshBasicMaterial extends Ting {}
export class SphereGeometry extends Ting {}
export class CylinderGeometry extends Ting {}
export class TorusGeometry extends Ting {}
export class PlaneGeometry extends Ting {}
export const DoubleSide = 2;
