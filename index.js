import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

app.post('/scrape', async (req, res) => {
  const { ruc } = req.body;
  if (!ruc) return res.status(400).json({ error: 'RUC requerido' });

  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.goto('https://www.compraspublicas.gob.ec/ProcesoContratacion/compras/PC/buscarProceso.cpe');
    await page.type('#entidad_ruc', ruc);
    await Promise.all([
      page.click('#btnBuscar'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr'));
      return rows.slice(1).map(row => {
        const cols = row.querySelectorAll('td');
        return {
          codigo: cols[0]?.textContent?.trim(),
          objeto: cols[1]?.textContent?.trim(),
          estado: cols[4]?.textContent?.trim(),
        };
      });
    });

    await browser.close();
    res.json({ procesos: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el scraping' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
