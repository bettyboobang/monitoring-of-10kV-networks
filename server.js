const express = require('express');
const app = express();
app.use(express.static('public'));
const PORT = 3001;

//Middleware для парсингу JSON у тілі запитів
app.use(express.json());

//Масив об'єктів
let distributionNetworks = [
    { id: 1, name: "Фідер-1 Центральний", voltage: 10, length: 15.5, activePower: 1200, reactivePower: 400, current: 75, losses: 45, substationCount: 8 },
    { id: 2, name: "Фідер-2 Промисловий", voltage: 10, length: 8.2, activePower: 2500, reactivePower: 800, current: 150, losses: 80, substationCount: 5 },
    { id: 3, name: "Фідер-3 Північний", voltage: 10, length: 22.0, activePower: 800, reactivePower: 200, current: 45, losses: 15, substationCount: 12 },
    { id: 4, name: "Фідер-4 Південний", voltage: 6, length: 5.5, activePower: 500, reactivePower: 150, current: 30, losses: 10, substationCount: 3 },
    { id: 5, name: "Фідер-5 Східний", voltage: 10, length: 18.4, activePower: 1800, reactivePower: 500, current: 110, losses: 65, substationCount: 9 }
];

//Головна сторінка автоматично перенаправляє на список мереж
app.get('/', (req, res) => {
    res.redirect('/api/distribution-networks');
});

//GET /api/distribution-networks (Отримати всі мережі з пагінацією та фільтрацією)
app.get('/api/distribution-networks', (req, res) => {
    const { search, minPower, maxPower, sortBy = 'id', sortOrder = 'asc', page = 1, limit = 10 } = req.query;
    let result = [...distributionNetworks];

    if (search) result = result.filter(n => n.name.toLowerCase().includes(search.toLowerCase()));
    if (minPower) result = result.filter(n => n.activePower >= Number(minPower));
    if (maxPower) result = result.filter(n => n.activePower <= Number(maxPower));

    result.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return sortOrder === 'asc' ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedResult = result.slice(startIndex, endIndex);

    res.status(200).json({
        total: result.length,
        page: Number(page),
        limit: Number(limit),
        data: paginatedResult
    });
});

//GET /api/distribution-networks/:id (Отримати конкретну мережу)
app.get('/api/distribution-networks/:id', (req, res) => {
    const network = distributionNetworks.find(n => n.id === parseInt(req.params.id));
    if (!network) return res.status(404).json({ error: "Помилка: Мережу з таким ID не знайдено." });
    res.status(200).json(network);
});

//GET /api/distribution-networks/:id/losses (Аналіз втрат)
app.get('/api/distribution-networks/:id/losses', (req, res) => {
    const network = distributionNetworks.find(n => n.id === parseInt(req.params.id));
    if (!network) return res.status(404).json({ error: "Помилка: Мережу не знайдено." });
    if (network.activePower === 0) return res.status(400).json({ error: "Неможливо розрахувати втрати (потужність 0)." });

    const lossPercentage = ((network.losses / network.activePower) * 100).toFixed(2);
    res.status(200).json({
        networkId: network.id,
        networkName: network.name,
        lossPercentage: parseFloat(lossPercentage),
        status: lossPercentage > 5.0 ? "CRITICAL (Втрати вище норми!)" : "NORMAL (Втрати в межах норми)"
    });
});

//GET /api/distribution-networks/:id/substations (Список ТП)
app.get('/api/distribution-networks/:id/substations', (req, res) => {
    const network = distributionNetworks.find(n => n.id === parseInt(req.params.id));
    if (!network) return res.status(404).json({ error: "Помилка: Мережу не знайдено." });

    let substations = Array.from({ length: network.substationCount }, (_, i) => ({
        id: `ТП-${network.id}-${i + 1}`,
        type: "10/0.4 кВ",
        status: "ОК"
    }));
    res.status(200).json({ networkName: network.name, substations });
});

//POST /api/distribution-networks (Додати нову мережу)
app.post('/api/distribution-networks', (req, res) => {
    const { name, voltage, length, activePower, reactivePower, current, losses, substationCount } = req.body;

    if (!name || typeof name !== 'string') return res.status(400).json({ error: "Поле 'name' обов'язкове (текст)." });
    if (!voltage || typeof voltage !== 'number') return res.status(400).json({ error: "Поле 'voltage' обов'язкове (число)." });

    const newNetwork = {
        id: distributionNetworks.length ? Math.max(...distributionNetworks.map(n => n.id)) + 1 : 1,
        name, voltage,
        length: length || 0, activePower: activePower || 0, reactivePower: reactivePower || 0,
        current: current || 0, losses: losses || 0, substationCount: substationCount || 0
    };

    distributionNetworks.push(newNetwork);
    res.status(201).json({ message: "Мережу створено", data: newNetwork });
});

//PUT /api/distribution-networks/:id (Оновити існуючу мережу)
app.put('/api/distribution-networks/:id', (req, res) => {
    const index = distributionNetworks.findIndex(n => n.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: "Мережу не знайдено." });

    distributionNetworks[index] = { 
        ...distributionNetworks[index], 
        ...req.body,
        id: distributionNetworks[index].id 
    };
    res.status(200).json({ message: "Дані оновлено", data: distributionNetworks[index] });
});

//Глобальний обробник помилок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Внутрішня помилка сервера!" });
});

app.listen(PORT, () => {
    console.log(`API сервер працює на http://localhost:${PORT}`);
});