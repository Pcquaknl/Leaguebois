import http from 'node:http';
export function createHttpServer(store,allowedOrigin='https://leaguebois.nl') {
  return http.createServer((req,res)=>{
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
    if(req.headers.origin===allowedOrigin) headers['Access-Control-Allow-Origin']=allowedOrigin;
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end(JSON.stringify({error:'method not allowed'}));return}
    const path=(req.url||'').split('?')[0];
    if(path==='/health'){res.writeHead(200,headers);res.end(req.method==='HEAD'?'':JSON.stringify({ok:true}));return}
    if(path==='/api/live'){res.writeHead(200,headers);res.end(req.method==='HEAD'?'':JSON.stringify(store.dataset()));return}
    res.writeHead(404,headers);res.end(JSON.stringify({error:'not found'}));
  });
}
