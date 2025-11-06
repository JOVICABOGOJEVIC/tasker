// Lazy load OpenAI - učitaj samo kada je potrebno
let openai = null;
let openaiInitialized = false;

const initializeOpenAI = async () => {
  if (!openaiInitialized) {
    try {
      const OpenAI = (await import('openai')).default;
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      openaiInitialized = true;
      console.log('✅ OpenAI uspešno inicijalizovan');
    } catch (error) {
      console.warn('⚠️ OpenAI paket nije instaliran. AI funkcionalnost nije dostupna.');
      console.warn('   Za instalaciju: npm install openai');
      console.warn('   Error:', error.message);
      return null;
    }
  }
  return openai;
};

/**
 * Extract job data from SMS/Viber message using AI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const extractJobDataFromMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Poruka je obavezna i mora biti tekst' 
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        message: 'OpenAI API key nije konfigurisan. Molimo dodajte OPENAI_API_KEY u .env fajl.' 
      });
    }

    // Initialize OpenAI client
    const openaiClient = await initializeOpenAI();
    if (!openaiClient) {
      return res.status(500).json({ 
        message: 'OpenAI paket nije instaliran. Molimo instalirajte: npm install openai' 
      });
    }

    // Create prompt for AI extraction
    const extractionPrompt = `Izvuci sledeće podatke iz SMS/Viber poruke i vrati kao JSON. Poruka je na srpskom jeziku. Ako podatak nije spomenut, koristi null.

Primer poruke:
"Zdravo, ja sam Marko Petrović, telefon 0651234567. Imam problem sa Samsung Galaxy S21, ne pali se ekran. Možete li doći sutra u 14h na adresu Bulevar kralja Aleksandra 15?"

Treba da izvučeš:
{
  "clientName": "Marko Petrović",
  "clientPhone": "0651234567",
  "clientEmail": null,
  "clientAddress": "Bulevar kralja Aleksandra 15",
  "deviceType": "telefon",
  "deviceBrand": "Samsung",
  "deviceModel": "Galaxy S21",
  "deviceSerialNumber": null,
  "issueDescription": "Ne pali se ekran",
  "priority": "medium",
  "serviceDate": "sutra" ili konkretan datum ako je spomenut,
  "serviceTime": "14:00"
}

Prioritet (priority) može biti: "low", "medium", "high", ili "urgent". Odredi na osnovu konteksta (hitno, urgencija, hitno = urgent/high, normalno = medium, nije hitno = low).

Vrati SAMO validan JSON objekat bez dodatnih komentara ili objašnjenja. Formatiraj JSON sa tačnim nazivima polja:

{
  "clientName": "ime i prezime ili null",
  "clientPhone": "broj telefona ili null",
  "clientEmail": "email ili null",
  "clientAddress": "adresa ili null",
  "deviceType": "tip uređaja (telefon, laptop, TV, itd.) ili null",
  "deviceBrand": "marka (Samsung, Apple, itd.) ili null",
  "deviceModel": "model ili null",
  "deviceSerialNumber": "serijski broj ili null",
  "issueDescription": "opis problema/kvara ili null",
  "priority": "low/medium/high/urgent ili null",
  "serviceDate": "datum u formatu YYYY-MM-DD ili null",
  "serviceTime": "vreme u formatu HH:MM ili null"
}

Poruka za analizu:
${message}`;

    // Call OpenAI API
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Ti si asistent koji izvlači strukturirane podatke iz SMS/Viber poruka na srpskom jeziku. Uvek vraćaš samo validan JSON objekat bez dodatnih komentara.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      response_format: { type: 'json_object' } // Force JSON response
    });

    // Extract the response
    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      return res.status(500).json({ 
        message: 'AI nije vratio odgovor' 
      });
    }

    // Parse JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI Response:', aiResponse);
      return res.status(500).json({ 
        message: 'Greška pri parsiranju AI odgovora',
        rawResponse: aiResponse
      });
    }

    // Process and normalize the data
    const processedData = {
      clientName: extractedData.clientName || null,
      clientPhone: extractedData.clientPhone || null,
      clientEmail: extractedData.clientEmail || null,
      clientAddress: extractedData.clientAddress || null,
      deviceType: extractedData.deviceType || null,
      deviceBrand: extractedData.deviceBrand || null,
      deviceModel: extractedData.deviceModel || null,
      deviceSerialNumber: extractedData.deviceSerialNumber || null,
      issueDescription: extractedData.issueDescription || null,
      priority: extractedData.priority ? extractedData.priority.toLowerCase() : 'medium',
      serviceDate: extractedData.serviceDate || null,
      serviceTime: extractedData.serviceTime || null
    };

    // Handle date parsing if serviceDate is provided
    if (processedData.serviceDate) {
      // Try to parse date if it's a string like "sutra", "prekosutra", etc.
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dateStr = processedData.serviceDate.toLowerCase();
      
      if (dateStr.includes('sutra') || dateStr.includes('tomorrow')) {
        processedData.serviceDate = tomorrow.toISOString().split('T')[0];
      } else if (dateStr.includes('prekosutra') || dateStr.includes('day after tomorrow')) {
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        processedData.serviceDate = dayAfterTomorrow.toISOString().split('T')[0];
      } else {
        // Try to parse as date
        try {
          const parsedDate = new Date(processedData.serviceDate);
          if (!isNaN(parsedDate.getTime())) {
            processedData.serviceDate = parsedDate.toISOString().split('T')[0];
          }
        } catch (e) {
          // If parsing fails, set to tomorrow as default
          processedData.serviceDate = tomorrow.toISOString().split('T')[0];
        }
      }
    }

    // Return processed data
    res.status(200).json({
      success: true,
      data: processedData,
      rawResponse: aiResponse // Include raw response for debugging
    });

  } catch (error) {
    console.error('Error in AI extraction:', error);
    
    // Handle OpenAI API errors
    if (error.response) {
      return res.status(500).json({ 
        message: 'Greška sa OpenAI API',
        error: error.response.data?.error?.message || error.message
      });
    }

    res.status(500).json({ 
      message: 'Greška pri ekstrakciji podataka',
      error: error.message
    });
  }
};

