class TopologyPad {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.currentSystem = 'SCHUCO';
    this.setupGrid();
  }
  setupGrid() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = '#e5e7eb';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.canvas.width; i += 20) {
      this.ctx.strokeRect(i, 0, 1, this.canvas.height);
      this.ctx.strokeRect(0, i, this.canvas.width, 1);
    }
  }
  cloneSystem(newSystem) {
    const confirmClone = confirm(`Convert topology to ${newSystem}? Review mullions post-conversion.`);
    if (confirmClone) {
      this.currentSystem = newSystem;
      this.ctx.lineWidth = newSystem === 'ALUPLAST' ? 6 : 4;
      alert(`System switched to ${newSystem}.`);
    } else {
      this.setupGrid();
      this.currentSystem = newSystem;
    }
  }
  saveState() { return this.canvas.toDataURL('image/png'); }
}
