import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function testSKUSearch() {
  const cjToken = process.env.CJ_API_KEY || '';
  const sku = 'CJBR1077474';
  
  console.log(`Searching for SKU: ${sku}`);
  const response = await axios.get(
    'https://developers.cjdropshipping.com/api2.0/v1/product/listV2',
    {
      params: { keyWord: sku, size: 5 },
      headers: { 'CJ-Access-Token': cjToken }
    }
  );
  
  console.log('Response Code:', response.data.code);
  console.log('Response Data:', JSON.stringify(response.data.data, null, 2));
}

testSKUSearch().catch(console.error);
