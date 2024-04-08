const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const port = 3333;
const target = 'https://api.openai.com';

app.use('/', createProxyMiddleware(
    {
        target,
        changeOrigin: true,
        on: {
            proxyReq: (proxy, req, res) => {
                console.log(proxy, '111')
            },
        },
    }

));


app.listen(port, () => {
    console.log(`Proxy server is running on port ${port}`);
});