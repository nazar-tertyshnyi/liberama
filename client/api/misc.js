import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

class Misc {
    async loadConfig() {
        const response = await api.post('/config', {params: ['name', 'version']});
        return response.data;
    }
}

export default new Misc();