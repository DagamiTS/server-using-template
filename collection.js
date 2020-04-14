import { promises as fs } from 'fs';
import { join } from 'path';

export class Collection {

  constructor(collectionName) {
    this.filePath = join(process.cwd(), 'data', collectionName + '.json');
  }

  list() {
    return this._readData();
  }

  async findOne(query) {
    return this._readData()
      .then(items => items.find(item => item.id === query.id));
  }

  async delete(query) {    
    const data = await this._readData();
    const filtered = await data.filter(eachHW => eachHW.id !== query.id);
    await fs.writeFile('./data/homeworks.json', JSON.stringify(filtered, null, 2));
  }

  async _readData() {
    const fileData = await fs.readFile(this.filePath, 'utf-8');
    return JSON.parse(fileData);
  }

  _writeData(data) {
    return fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async insertOne(data) {
    const id = Math.random().toString(16).slice(-12) + Math.random().toString(16).slice(-12);
    data.id = id;
    const documents = await this._readData();
    const result = [...documents];
    if (documents.every(doc => doc.id !== id)) {
      result.unshift(data);
      return this._writeData(result);
    }
  }

  async updateOne(id, update) {
    const documents = await this._readData();
    const updatedHomeworks = documents.map(doc =>
      (doc.id === id) ? Object.assign({}, doc, update) : doc);
    return this._writeData(updatedHomeworks);
  }

}