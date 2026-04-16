const fs = require('fs');
const pids = [1601665039555, 1601403830660, 1601615644636, 1601706421074, 1601665084906, 1600948553486, 1601564721313, 1600700939363, 1600320733662, 1601683469796];
const mapping = {};

pids.forEach(pid => {
  const filePath = `scripts/result_${pid}.json`;
  if (fs.existsSync(filePath)) {
    mapping[pid] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    mapping[pid] = { gallery: [], video: '', detail_images: [], certs: [] };
  }
});

fs.writeFileSync('scripts/final_results.json', JSON.stringify(mapping, null, 2));
console.log('Final mapping saved to scripts/final_results.json');
