const getClientReplyMessage = require('./clientReplyTemplate');
const { sendEmails } = require('./emailService');

export default {
	async fetch(request, env, ctx) {
	  // CORS Configuration
	  const origin = request.headers.get('Origin');
	  const allowedOrigins = ['https://philipmutua.xyz', 'http://localhost:4200','http://127.0.0.1:8787'];
	  const isAllowedOrigin = allowedOrigins.includes(origin);
  
	  const corsHeaders = {
		'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
	  };
  
	  // Handle OPTIONS preflight request
	  if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders });
	  }
  
	  // Only allow POST requests
	  if (request.method !== 'POST') {
		return new Response(
		  JSON.stringify({ error: 'Method not allowed', allowedMethods: ['POST'] }),
		  { status: 405, headers: corsHeaders }
		);
	  }
  
	  try {
		// API Key Validation
		const apiKey = request.headers.get('X-API-Key');
		if (!apiKey || apiKey !== env.API_KEY) {
		  return new Response(
			JSON.stringify({ error: 'Unauthorized', message: 'Invalid API key' }),
			{ status: 401, headers: corsHeaders }
		  );
		}
  
		// Rate Limiting Implementation
		const clientIP = request.headers.get('CF-Connecting-IP') || 
						request.headers.get('X-Forwarded-For') || 
						'unknown';
		const rateLimitKey = `rate_limit:${clientIP}`;
		const windowMs = 15 * 60 * 1000; // 15 minutes
		const maxRequests = 5;
		const currentTime = Date.now();
  
		let requestCount = 1;
		let windowStart = currentTime;
  
		if (env.RATE_LIMIT_KV) {
		  const rateLimitData = await env.RATE_LIMIT_KV.get(rateLimitKey);
		  
		  if (rateLimitData) {
			const { count, windowStart: storedWindowStart } = JSON.parse(rateLimitData);
			const timeSinceWindowStart = currentTime - storedWindowStart;
  
			if (timeSinceWindowStart < windowMs) {
			  requestCount = count + 1;
			  windowStart = storedWindowStart;
  
			  if (requestCount > maxRequests) {
				const remainingMinutes = Math.ceil((windowMs - timeSinceWindowStart) / 60000);
				return new Response(
				  JSON.stringify({
					error: 'Rate limit exceeded',
					message: `Too many requests. Please try again in ${remainingMinutes} minute(s).`,
					retryAfter: remainingMinutes,
				  }),
				  {
					status: 429,
					headers: {
					  ...corsHeaders,
					  'Retry-After': Math.ceil((windowMs - timeSinceWindowStart) / 1000).toString(),
					  'X-RateLimit-Limit': maxRequests.toString(),
					  'X-RateLimit-Remaining': '0',
					  'X-RateLimit-Reset': new Date(windowStart + windowMs).toISOString(),
					},
				  }
				);
			  }
			}
		  }
  
		  // Update rate limit in KV
		  await env.RATE_LIMIT_KV.put(
			rateLimitKey,
			JSON.stringify({ count: requestCount, windowStart }),
			{ expirationTtl: Math.ceil(windowMs / 1000) }
		  );
		}
  
		const rateLimitHeaders = {
		  'X-RateLimit-Limit': maxRequests.toString(),
		  'X-RateLimit-Remaining': (maxRequests - requestCount).toString(),
		  'X-RateLimit-Reset': new Date(windowStart + windowMs).toISOString(),
		};
  
		// Request Body Processing
		let data;
		try {
		  data = await request.json();
		} catch (e) {
		  return new Response(
			JSON.stringify({ error: 'Invalid JSON payload' }),
			{ status: 400, headers: { ...corsHeaders, ...rateLimitHeaders } }
		  );
		}
  
		// Form Validation
		const { formType } = data;
		if (!formType) {
		  return new Response(
			JSON.stringify({ error: 'Missing required field', field: 'formType' }),
			{ status: 400, headers: { ...corsHeaders, ...rateLimitHeaders } }
		  );
		}
  
		// Validation Utilities
		const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim() || '');
		const isValidPhone = (phone) => !phone || /^[\d\s+\-()]{6,20}$/.test(phone);
		const sanitize = (val) => (val ? val.toString().trim() : '');
		const validateLength = (field, value, min, max = 1000) => {
		  value = sanitize(value);
		  if (!value) return `${field} is required`;
		  if (value.length < min) return `${field} must be at least ${min} characters`;
		  if (value.length > max) return `${field} must be less than ${max} characters`;
		  return null;
		};
  
		const errors = [];
		let notificationContent = '';
  
		// Form Type Handling
		switch (formType) {
		  case 'quote': {
			const { name, email, phone, project, budget, timeline, language } = data;
			
			const nameError = validateLength('Name', name, 2);
			if (nameError) errors.push(nameError);
			if (!isValidEmail(email)) errors.push('Invalid email address');
			if (!isValidPhone(phone)) errors.push('Invalid phone number format');
			const projectError = validateLength('Project description', project, 5);
			if (projectError) errors.push(projectError);
			
			notificationContent = `New Quote Request\n\nName: ${sanitize(name)}\nEmail: ${sanitize(email)}\nPhone: ${phone ? sanitize(phone) : 'N/A'}\nProject: ${sanitize(project)}\nBudget: ${budget ? sanitize(budget) : 'N/A'}\nTimeline: ${timeline ? sanitize(timeline) : 'N/A'}`;
			const payload = {
				name: name,                 // Client's name (string)
				budget: budget,       // Budget info (string, optional)
				timeline: timeline,           // Timeline info (string, optional)
				preferredContact: 'Email',      // Preferred contact method (string)
				formType: formType,              // Form type: 'quote', 'message', 'recruiter_query', 'interview_proposal', or any other string for default
				language: language                  // Language code: 'en', 'sw', 'fr', 'es', or 'de' (default: 'en')
			  };
			const subject = `New Quote Request - ${name}`;
			const clientReply = getClientReplyMessage(payload);	
			const response = await sendEmails(env, email, subject, notificationContent, clientReply, corsHeaders);
			console.log('Response:', response);
			break;
		  }
  
		  case 'message': {
			const { name, email, phone, subject, messageBody, language } = data;
			
			const nameError = validateLength('Name', name, 2);
			if (nameError) errors.push(nameError);
			if (!isValidEmail(email)) errors.push('Invalid email address');
			if (!isValidPhone(phone)) errors.push('Invalid phone number format');
			const subjectError = validateLength('Subject', subject, 3);
			if (subjectError) errors.push(subjectError);
			const messageError = validateLength('Message', messageBody, 10);
			if (messageError) errors.push(messageError);
			
			notificationContent = `New Message\n\nName: ${sanitize(name)}\nEmail: ${sanitize(email)}\nPhone: ${phone ? sanitize(phone) : 'N/A'}\nSubject: ${sanitize(subject)}\nMessage: ${sanitize(messageBody)}`;

			const payload = {
				name: name,                 // Client's name (string)
				budget: null,       // Budget info (string, optional)
				timeline: null,           // Timeline info (string, optional)
				preferredContact: 'Email',      // Preferred contact method (string)
				formType: formType,              // Form type: 'quote', 'message', 'recruiter_query', 'interview_proposal', or any other string for default
				language: language                  // Language code: 'en', 'sw', 'fr', 'es', or 'de' (default: 'en')
			  };
			const _subject = `New Message - ${subject}`;
			const clientReply = getClientReplyMessage(payload);	
			const response = await sendEmails(env, email, _subject, notificationContent, clientReply, corsHeaders);
			console.log('Response:', response);
			break;
		  }
  
		  case 'recruiter_query': {
			const { recruiterName, recruiterEmail, companyName, roleLocation, roleTitle, roleDescription, keySkills, linkToJD, language } = data;
			
			const recruiterNameError = validateLength('Recruiter name', recruiterName, 2);
			if (recruiterNameError) errors.push(recruiterNameError);
			if (!isValidEmail(recruiterEmail)) errors.push('Invalid recruiter email');
			const roleTitleError = validateLength('Role title', roleTitle, 3);
			if (roleTitleError) errors.push(roleTitleError);
			const companyNameError = validateLength('Company name', companyName, 2);
			if (companyNameError) errors.push(companyNameError);
			
			notificationContent = `Recruiter Query\n\nRecruiter: ${sanitize(recruiterName)}\nCompany: ${sanitize(companyName)}\nEmail: ${sanitize(recruiterEmail)}\nLocation: ${roleLocation ? sanitize(roleLocation) : 'N/A'}\nRole: ${sanitize(roleTitle)}\nDescription: ${roleDescription ? sanitize(roleDescription) : 'N/A'}\nSkills: ${keySkills ? sanitize(keySkills) : 'N/A'}\nJD Link: ${linkToJD ? sanitize(linkToJD) : 'N/A'}`;
			const payload = {
				name: recruiterEmail,                 // Client's name (string)
				budget: null,       // Budget info (string, optional)
				timeline: null,           // Timeline info (string, optional)
				preferredContact: 'Email',      // Preferred contact method (string)
				formType: formType,              // Form type: 'quote', 'message', 'recruiter_query', 'interview_proposal', or any other string for default
				language: language                  // Language code: 'en', 'sw', 'fr', 'es', or 'de' (default: 'en')
			  };
			const subject = `New Recruiter Query - ${recruiterName}`;
			const clientReply = getClientReplyMessage(payload);
			const response = await sendEmails(env, recruiterEmail, subject, notificationContent, clientReply, corsHeaders);
			console.log('Response:', response);
			break;
		  }
  
		  case 'interview_proposal': {
			const { recruiterName, companyName, recruiterEmail, proposedDate1, proposedDate2, interviewTimezoneRecruiter, roleTitleInterview, language} = data;
			
			const recruiterNameError = validateLength('Recruiter name', recruiterName, 2);
			if (recruiterNameError) errors.push(recruiterNameError);
			if (!isValidEmail(recruiterEmail)) errors.push('Invalid recruiter email');
			const roleTitleError = validateLength('Role title', roleTitleInterview, 3);
			if (roleTitleError) errors.push(roleTitleError);
			const companyNameError = validateLength('Company name', companyName, 2);
			if (companyNameError) errors.push(companyNameError);
			if (!proposedDate1 && !proposedDate2) errors.push('At least one proposed date is required');
			
			notificationContent = `Interview Proposal\n\nRecruiter: ${sanitize(recruiterName)}\nCompany: ${sanitize(companyName)}\nEmail: ${sanitize(recruiterEmail)}\nDate 1: ${proposedDate1 ? sanitize(proposedDate1) : 'N/A'}\nDate 2: ${proposedDate2 ? sanitize(proposedDate2) : 'N/A'}\nTimezone: ${interviewTimezoneRecruiter ? sanitize(interviewTimezoneRecruiter) : 'N/A'}\nRole: ${sanitize(roleTitleInterview)}`;
			const payload = {
				name: recruiterName,                 // Client's name (string)
				budget: null,       // Budget info (string, optional)
				timeline: null,           // Timeline info (string, optional)
				preferredContact: 'Email',      // Preferred contact method (string)
				formType: formType,              // Form type: 'quote', 'message', 'recruiter_query', 'interview_proposal', or any other string for default
				language: language                  // Language code: 'en', 'sw', 'fr', 'es', or 'de' (default: 'en')
			  };
			const subject = `Interview Proposal - ${recruiterName}`;
			const clientReply = getClientReplyMessage(payload);
			const response = await sendEmails(env, recruiterEmail, subject, notificationContent, clientReply, corsHeaders);
			console.log('Response:', response);
			break;
		  }
  
		  default:
			return new Response(
			  JSON.stringify({ error: 'Invalid form type', validTypes: ['quote', 'message', 'recruiter_query', 'interview_proposal'] }),
			  { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders } }
			);
		}
  
		// Return validation errors if any
		if (errors.length > 0) {
		  return new Response(
			JSON.stringify({ error: 'Validation failed', details: errors }),
			{ status: 422, headers: { ...corsHeaders, ...rateLimitHeaders } }
		  );
		}
  
		// Here you would implement your actual notification logic
		// For now, we'll just log it
		console.log('Notification to be sent:', notificationContent);
  
		// Simulate sending the notification
		try {
		  // Replace with actual notification sending code
		  // await sendNotification(notificationContent);
		  
		  return new Response(
			JSON.stringify({ success: true, message: 'Form submitted successfully' }),
			{ status: 200, headers: { ...corsHeaders, ...rateLimitHeaders } }
		  );
		} catch (notificationError) {
		  console.error('Notification failed:', notificationError);
		  return new Response(
			JSON.stringify({ error: 'Notification failed', message: 'Form was validated but we failed to process it' }),
			{ status: 500, headers: { ...corsHeaders, ...rateLimitHeaders } }
		  );
		}
  
	  } catch (error) {
		console.error('Server error:', error);
		return new Response(
		  JSON.stringify({ error: 'Internal server error', message: 'An unexpected error occurred' }),
		  { status: 500, headers: corsHeaders }
		);
	  }
	},
  };