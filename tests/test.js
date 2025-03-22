const axios = require('axios');
const cheerio = require('cheerio');

async function searchGoogle(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    const results = [];
    $('h3').each((index, element) => {
      const title = $(element).text();
      const link = $(element).parent().attr('href');
      results.push({ title, link });
    });
    
    console.log(results);  // Display the search results
  } catch (error) {
    console.error('Error:', error);
  }
}

searchGoogle('amazon.com');
