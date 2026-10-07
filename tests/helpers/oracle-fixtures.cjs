function resultFor(keys) {
 return {version:1,general:'Kartlar birlikte bir yön gösteriyor.\n\nBu açılımın genel yorumu.',positions:keys.map((key,i)=>({positionKey:key,context:'Bu konumun kısa yorumu.',connections:keys.length===1?[]:[{positionKey:keys[(i+1)%keys.length],text:'Bu iki kartın bağlantısı.'}]}))};
}
module.exports={resultFor};
