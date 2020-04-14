import * as http from 'http';
import { Collection } from './collection.js';
import { promises as fsp } from 'fs';
import { parse } from 'querystring';
import Mustache from 'mustache';

const PORT = process.env.PORT || 5000;
const collection = new Collection('homeworks');

let templates = {};

async function loadTemplates() {
  templates = {
    list: await fsp.readFile('./templates/list.html', 'utf8'),
    homework: await fsp.readFile('./templates/homework.html', 'utf8'),
    css: await fsp.readFile('./public/styles.css', 'utf8'),
  };
}

/**
 * @param {http.IncomingMessage} req
 * @retruns {string}
 */
const readBody = (req) => {
  return new Promise((resolve, reject) => {

    let body = '';
    req.on('data', data => {
      body = body + data.toString('utf8');
    });

    req.on('end', async () => {
      resolve(parse(body));
    });

    req.on('error', error => reject(error));
  });
};

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
const requestListener = async (req, res) => {

  const send = (status, data) => {
    res.writeHead(status);
    if (data) {
      const body = (typeof data === 'string') ? data : JSON.stringify(data);
      res.write(body);
    }
    res.end();
  };

  if (req.url === '/styles.css' && req.method === 'GET') {
    send(200, templates.css);
    return;
  }

  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(302, { Location: '/homeworks' });
    res.end();
    return;
  }

  if (req.url.startsWith('/homeworks')) {
    if (req.method === 'GET' && (req.url === '/homeworks' || req.url === '/homeworks/')) {
      const data = await collection.list();
      send(200, Mustache.render(templates.list, { title: 'Homeworks', rows: data }));
      return;
    }

    if (req.url.startsWith('/homeworks/new')) {
      switch (req.method) {
      case 'GET': {
        const body = Mustache.render(templates.homework, 'undefined');
        send(200, body);
        break;
      }
      case 'POST': {
        const updateData = await readBody(req);
        collection.insertOne(updateData);
        res.writeHead(302, { Location: '/homeworks' });
        res.end();
        break;
      }
      }
      return;
    }

    if (req.url.startsWith('/homeworks/')) {
      const id = req.url.substring('/homeworks/'.length);
      const homework = await collection.findOne({ id });
      switch (req.method) {
      case 'GET':
        if (homework) {
          const body = Mustache.render(templates.homework, homework);
          send(200, body);
        } else {
          send(404);
        }
        break;
      case 'POST': {
        const updateData = await readBody(req);
        await collection.updateOne(homework.id, updateData);
        res.writeHead(302, { Location: req.url });
        res.end();
        break;
      }
      case 'DELETE': {
        await collection.delete({ id });
        res.writeHead(200);
        res.end();
        return;
      }
      }
      return;
    }
  }

  res.writeHead(404);
  res.end();
};

/**
 * асинхронная функция main добавлена для возможности использования await
 */
async function main() {
  await loadTemplates();
  const server = http.createServer(requestListener);
  server.listen(PORT);
}

main();