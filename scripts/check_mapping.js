const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync('./data/1688/smart_home.json', 'utf-8'));
const mapping = JSON.parse(fs.readFileSync('./data/1688/translated_mapping.json', 'utf-8'));

console.log("Data Titles vs Mapping Keys:");
data.forEach(item => {
    const title = item.title;
    const match = mapping[title];
    console.log(`[${title.length}] ${title.substring(0, 20)}... | Match: ${match ? 'YES' : 'NO'}`);
});
