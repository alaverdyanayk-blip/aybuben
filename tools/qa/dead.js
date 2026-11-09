const acorn=require('acorn'),fs=require('fs'),path=require('path');const root=require('path').join(__dirname,'../../');
const html=fs.readFileSync(root+'build/aybuben.html','utf8');const a=html.indexOf('<script>')+8,b=html.lastIndexOf('</script>');const js=html.slice(a,b);
const extra=fs.readFileSync(root+'src/tg-adapter.js','utf8')+fs.readFileSync(root+'src/stats-sender.js','utf8')+html.slice(0,a);
const ast=acorn.parse(js,{ecmaVersion:2022});const names=[];
for(const n of ast.body){if(n.type==='VariableDeclaration')n.declarations.forEach(d=>d.id.name&&names.push(d.id.name));if(n.type==='FunctionDeclaration')names.push(n.id.name)}
const all=js+extra;const dead=names.filter(n=>{const re=new RegExp('(?<![\\w$.])'+n.replace(/\$/g,'\\$')+'(?![\\w$])','g');return (all.match(re)||[]).length<=1});
console.log('unused top-level:',dead.join(', '));
// CSS-классы, которых нет ни в разметке, ни в JS
const css=html.slice(html.indexOf('<style>'),html.indexOf('</style>'));const cls=new Set((css.match(/\.[a-zA-Z_][\w-]*/g)||[]).map(c=>c.slice(1)));
const body=js+extra+html.slice(html.indexOf('</style>'),a);const un=[...cls].filter(c=>!new RegExp('(?<![\\w-])'+c+'(?![\\w-])').test(body));
console.log('css classes not referenced:',un.join(' '));
