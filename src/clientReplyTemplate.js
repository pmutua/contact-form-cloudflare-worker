/**
 * getClientReplyMessage.js
 * 
 * Generates a personalized, professional HTML email reply message
 * based on form type and client data with multilingual support.
 */

module.exports = function getClientReplyMessage(sanitizedData) {
    const {
      name = 'there',
      budget,
      timeline,
      preferredContact = 'Not specified',
      formType,
      language = 'en',
    } = sanitizedData;
  
    // Localized message templates for 5 languages
    const messages = {
      en: {
        quote: `Hi ${name}, thank you for requesting a project quote. I’m currently reviewing your information and will follow up soon.`,
        message: `Hi ${name}, thanks for getting in touch. I’ve received your message and will respond shortly.`,
        recruiter_query: `Hello ${name}, thank you for reaching out regarding recruitment. I’ll review your inquiry and respond as soon as I can.`,
        interview_proposal: `Hi ${name}, I appreciate the interview proposal. I’ll take a look at your availability and respond with next steps.`,
        default: `Hi ${name}, thank you for reaching out. I'll take a look at your message and get back to you soon.`,
        followUp: `I appreciate your interest and will be in touch shortly.`,
      },
  
      sw: {
        quote: `Habari ${name}, asante kwa kuomba nukuu ya mradi. Ninapitia maelezo yako na nitawasiliana nawe hivi karibuni.`,
        message: `Habari ${name}, asante kwa kunifikia. Nimepokea ujumbe wako na nitajibu hivi karibuni.`,
        recruiter_query: `Salamu ${name}, asante kwa kuwasiliana kuhusu ajira. Nitapitia maelezo yako na nitajibu haraka iwezekanavyo.`,
        interview_proposal: `Habari ${name}, ninathamini pendekezo lako la usaili. Nitachunguza ratiba yako na nitajibu kwa hatua zinazofuata.`,
        default: `Habari ${name}, asante kwa kuwasiliana. Nitapitia ujumbe wako na nitawasiliana nawe hivi karibuni.`,
        followUp: `Nathamini shauku yako na nitawasiliana nawe hivi karibuni.`,
      },
  
      fr: {
        quote: `Bonjour ${name}, merci d'avoir demandé un devis. Je suis en train d'examiner vos informations et je reviendrai vers vous bientôt.`,
        message: `Bonjour ${name}, merci de m'avoir contacté. J'ai bien reçu votre message et je répondrai sous peu.`,
        recruiter_query: `Bonjour ${name}, merci pour votre intérêt concernant le recrutement. J'examinerai votre demande et vous répondrai dès que possible.`,
        interview_proposal: `Bonjour ${name}, merci pour la proposition d'entretien. Je vais vérifier vos disponibilités et vous recontacterai rapidement.`,
        default: `Bonjour ${name}, merci pour votre message. Je vais l'examiner et vous répondre sous peu.`,
        followUp: `Je vous remercie de votre intérêt et vous répondrai bientôt.`,
      },
  
      es: {
        quote: `Hola ${name}, gracias por solicitar un presupuesto. Estoy revisando la información y te contactaré pronto.`,
        message: `Hola ${name}, gracias por comunicarte. He recibido tu mensaje y responderé en breve.`,
        recruiter_query: `Hola ${name}, gracias por tu interés en reclutamiento. Revisaré tu consulta y responderé lo antes posible.`,
        interview_proposal: `Hola ${name}, gracias por la propuesta de entrevista. Revisaré tu disponibilidad y responderé pronto.`,
        default: `Hola ${name}, gracias por contactarme. Revisaré tu mensaje y te responderé pronto.`,
        followUp: `Agradezco tu interés y me pondré en contacto contigo pronto.`,
      },
  
      de: {
        quote: `Hallo ${name}, danke für Ihre Anfrage für ein Angebot. Ich prüfe Ihre Angaben und melde mich bald bei Ihnen.`,
        message: `Hallo ${name}, danke für Ihre Nachricht. Ich habe Ihre Nachricht erhalten und werde bald antworten.`,
        recruiter_query: `Hallo ${name}, danke für Ihre Interesse bezüglich der Rekrutierung. Ich werde Ihre Anfrage prüfen und so bald wie möglich antworten.`,
        interview_proposal: `Hallo ${name}, danke für den Interviewvorschlag. Ich überprüfe Ihre Verfügbarkeit und werde mich mit den nächsten Schritten melden.`,
        default: `Hallo ${name}, danke für Ihre Kontaktaufnahme. Ich werde Ihre Nachricht prüfen und bald antworten.`,
        followUp: `Ich schätze Ihr Interesse und werde mich in Kürze bei Ihnen melden.`,
      }
    };
  
    // Pick the appropriate language or fallback to English
    const t = messages[language] || messages.en;
  
    // Get the intro message based on form type
    const introMessage = t[formType] || t.default;
    const followUpNote = t.followUp;
  
    return `
  <!DOCTYPE html>
  <html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Thank you for reaching out!</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #eee;">
      <!--
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="hello@philipmutua.xyz/assets/logo.png" alt="Philip Mutua Logo" style="height: 48px;" />
      </div>
      -->
      <p style="font-size: 18px; margin-bottom: 20px;">${introMessage}</p>
  
      ${(budget || timeline) ? `
        <p style="margin: 5px 0;"><strong>${language === 'sw' ? 'Bajeti' : language === 'fr' ? 'Budget' : language === 'es' ? 'Presupuesto' : language === 'de' ? 'Budget' : 'Budget'}:</strong> ${budget || (language === 'sw' ? 'Itajadiliwa' : 'To be discussed')}</p>
        <p style="margin: 5px 0;"><strong>${language === 'sw' ? 'Muda' : language === 'fr' ? 'Délais' : language === 'es' ? 'Cronograma' : language === 'de' ? 'Zeitrahmen' : 'Timeline'}:</strong> ${timeline || (language === 'sw' ? 'Itajadiliwa' : 'To be discussed')}</p>
      ` : ''}
  
      <p style="margin: 5px 0;"><strong>${language === 'sw' ? 'Njia ya Mawasiliano' : language === 'fr' ? 'Contact préféré' : language === 'es' ? 'Contacto preferido' : language === 'de' ? 'Bevorzugter Kontakt' : 'Preferred Contact'}:</strong> ${preferredContact}</p>
  
      <p style="margin-top: 30px;">${followUpNote}</p>
  
      <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
        <p style="margin: 0;">${language === 'sw' ? 'Salamu' : language === 'fr' ? 'Cordialement' : language === 'es' ? 'Saludos cordiales' : language === 'de' ? 'Mit freundlichen Grüßen' : 'Best regards'},</p>
        <p style="margin: 2px 0;"><strong>Philip Mutua</strong></p>
        <p style="margin: 2px 0;">Senior Software Engineer</p>
        <p style="margin: 2px 0;">
          <a href="mailto:hello@philipmutua.xyz" style="color: #007acc; text-decoration: none;">hello@philipmutua.xyz</a> | 
          <a href="https://philipmutua.xyz" style="color: #007acc; text-decoration: none;">philipmutua.xyz</a>
        </p>
      </div>
  
    </div>
  </body>
  </html>
  `;
  };
  