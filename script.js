// Chat bot state
const conversation = {
  step: 0,
  data: {
    coverType: null,
    region: null,
    destId: null,
    startDate: null,
    endDate: null,
    travellers: [],
    travellerCount: null,
    holidayValue: null,
    medicalConditions: null,
    undiagnosedSymptoms: null,
    policySubtype: 'non-medical',
    certificateID: null,
    hash: null
  }
};

// Conversation steps
const steps = [
  {
    id: 'greeting',
    botMessage: "Hi there! 👋 I'm here to help you get sorted with travel insurance. This'll only take a couple of minutes, and I promise to make it as painless as possible! Ready to get started?",
    options: [
      { text: "Let's do this! 🎉", value: "yes", next: "coverType" },
      { text: "Tell me more first", value: "info", next: "moreInfo" }
    ]
  },
  {
    id: 'moreInfo',
    botMessage: "No worries! Here's the quick version: I'll ask you about your trip, who's travelling, and a couple of health questions. Then you'll get a quote instantly. The whole thing takes about 2 minutes. Sound good?",
    options: [
      { text: "Perfect, let's go! 🚀", value: "yes", next: "coverType" }
    ]
  },
  {
    id: 'coverType',
    botMessage: "First up - are you planning one amazing trip, or are you a regular jetsetter?",
    type: 'cards',
    options: [
      {
        icon: "✈️",
        title: "Single Trip",
        description: "Perfect for one-off holidays",
        value: "single"
      },
      {
        icon: "🌍",
        title: "Annual Multi-Trip",
        description: "Cover all your trips for a year",
        value: "annual"
      }
    ],
    onSelect: (value) => {
      conversation.data.coverType = value;
      nextStep('destination');
    }
  },
  {
    id: 'destination',
    botMessage: "Nice! Where are you heading? 🗺️",
    type: 'buttons',
    options: [
      { text: "UK 🏴󐁧󐁢", value: "UK" },
      { text: "Europe 🇪🇺", value: "Europe" },
      { text: "Australia/NZ 🦘", value: "ANZ" },
      { text: "Worldwide 🌎", value: "Worldwide" }
    ],
    onSelect: (value) => {
      conversation.data.region = value;
      if (value === 'Europe') {
        nextStep('europeHighRisk');
      } else if (value === 'Worldwide') {
        nextStep('worldwideUSA');
      } else {
        calculateDestinationId();
        nextStep('dates');
      }
    }
  },
  {
    id: 'europeHighRisk',
    botMessage: "Quick question - are you visiting Spain, Cyprus, Malta, Turkey, or Greece?",
    type: 'buttons',
    options: [
      { text: "Yes ☀️", value: "yes" },
      { text: "No, somewhere else", value: "no" }
    ],
    onSelect: (value) => {
      conversation.data.europeHighRisk = value === 'yes';
      calculateDestinationId();
      nextStep('dates');
    }
  },
  {
    id: 'worldwideUSA',
    botMessage: "Are you planning to visit USA, Canada, Mexico, or the Caribbean?",
    type: 'buttons',
    options: [
      { text: "Yes 🌴", value: "yes" },
      { text: "No, other places", value: "no" }
    ],
    onSelect: (value) => {
      conversation.data.worldwideUSA = value === 'yes';
      calculateDestinationId();
      nextStep('dates');
    }
  },
  {
    id: 'dates',
    botMessage: conversation.data.coverType === 'annual'
      ? "When would you like your annual cover to start?"
      : "When are you travelling?",
    type: 'dates',
    onComplete: () => {
      nextStep('travellers');
    }
  },
  {
    id: 'travellers',
    botMessage: "How many people are travelling?",
    type: 'select',
    options: Array.from({length: 9}, (_, i) => ({
      text: `${i + 1} ${i === 0 ? 'person' : 'people'}`,
      value: i + 1
    })),
    onSelect: (value) => {
      conversation.data.travellerCount = parseInt(value);
      nextStep('travellerDetails');
    }
  },
  {
    id: 'travellerDetails',
    botMessage: `Great! I just need a few quick details about ${conversation.data.travellerCount === 1 ? 'you' : 'everyone'}.`,
    type: 'travellerForm',
    onComplete: () => {
      nextStep('holidayValue');
    }
  },
  {
    id: 'holidayValue',
    botMessage: "What's your holiday cost per person? (This helps us get your cancellation cover right)",
    type: 'select',
    options: [
      { text: "Up to £500", value: 500 },
      { text: "£500 - £1,000", value: 1000 },
      { text: "£1,000 - £2,500", value: 2500 },
      { text: "£2,500 - £5,000", value: 5000 },
      { text: "£5,000 - £6,000", value: 6000 },
      { text: "£6,000 - £7,000", value: 7000 },
      { text: "£7,000 - £8,000", value: 8000 },
      { text: "£8,000 - £9,000", value: 9000 },
      { text: "£9,000 - £10,000", value: 10000 },
      { text: "£10,000+", value: 20000 }
    ],
    onSelect: (value) => {
      conversation.data.holidayValue = parseInt(value);
      nextStep('medicalIntro');
    }
  },
  {
    id: 'medicalIntro',
    botMessage: "Almost done! Just two quick health questions to make sure you're covered properly. Don't worry - most people sail through these! 🏥",
    options: [
      { text: "No problem, ask away!", value: "ok", next: "medicalQuestion1" }
    ]
  },
  {
    id: 'medicalQuestion1',
    botMessage: "Has anyone travelling ever had (or currently experiencing):\n\n• Active cancer treatment or surgery\n• Awaiting test results\n• Terminal illness\n• Heart, lung, or other serious conditions\n• Any cancer diagnosis\n• Any condition treated in the last 2 years",
    type: 'buttons',
    options: [
      { text: "Yes", value: "yes" },
      { text: "No ✓", value: "no" }
    ],
    onSelect: (value) => {
      conversation.data.medicalConditions = value;
      if (value === 'yes') {
        conversation.data.policySubtype = 'medical';
        nextStep('medicalRedirect');
      } else {
        nextStep('medicalQuestion2');
      }
    }
  },
  {
    id: 'medicalQuestion2',
    botMessage: "Last one! Is anyone experiencing symptoms that haven't been diagnosed by a doctor yet?",
    type: 'buttons',
    options: [
      { text: "Yes", value: "yes" },
      { text: "No ✓", value: "no" }
    ],
    onSelect: (value) => {
      conversation.data.undiagnosedSymptoms = value;
      if (value === 'yes') {
        addBotMessage("Just so you know - undiagnosed symptoms won't be covered, but let's continue with your quote.");
      }
      nextStep('allDone');
    }
  },
  {
    id: 'medicalRedirect',
    botMessage: "No problem! We'll need to ask a few more detailed questions to make sure you get the right cover. I'll take you to our medical screening now.",
    options: [
      { text: "Take me there", value: "ok", next: "getQuote" }
    ]
  },
  {
    id: 'allDone',
    botMessage: "Perfect! You're all done. 🎉 Let me get your quote now...",
    options: [
      { text: "Show me my quote! 🎯", value: "ok", next: "getQuote" }
    ]
  }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  startConversation();
});

function startConversation() {
  const step = steps[0];
  showStep(step);
}

function showStep(step) {
  setTimeout(() => {
    addBotMessage(step.botMessage, step.type);

    if (step.options && step.type !== 'cards' && step.type !== 'buttons' && step.type !== 'select') {
      showButtonOptions(step.options);
    } else if (step.type === 'cards') {
      showCardOptions(step.options, step.onSelect);
    } else if (step.type === 'buttons') {
      showButtonOptions(step.options, step.onSelect);
    } else if (step.type === 'select') {
      showSelectInput(step.options, step.onSelect);
    } else if (step.type === 'dates') {
      showDateInputs(step.onComplete);
    } else if (step.type === 'travellerForm') {
      showTravellerForm(step.onComplete);
    }
  }, 600);
}

function addBotMessage(text, type) {
  const messagesContainer = document.getElementById('chatMessages');

  // Show typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot';
  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(typingDiv);
  scrollToBottom();

  // Replace with actual message after delay
  setTimeout(() => {
    typingDiv.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-bubble">${text.replace(/\n/g, '<br>')}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
  }, 800);
}

function addUserMessage(text) {
  const messagesContainer = document.getElementById('chatMessages');

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user';
  messageDiv.innerHTML = `
    <div class="message-bubble">${text}</div>
    <div class="message-avatar">👤</div>
  `;
  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

function showButtonOptions(options, onSelect) {
  setTimeout(() => {
    const inputArea = document.getElementById('chatInputArea');
    inputArea.innerHTML = '';

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'button-options';

    options.forEach(option => {
      const button = document.createElement('button');
      button.className = 'btn-option';
      button.textContent = option.text;
      button.onclick = () => {
        addUserMessage(option.text);
        inputArea.innerHTML = '';

        if (onSelect) {
          onSelect(option.value);
        } else if (option.next) {
          nextStep(option.next);
        }
      };
      optionsDiv.appendChild(button);
    });

    inputArea.appendChild(optionsDiv);
  }, 1400);
}

function showCardOptions(options, onSelect) {
  setTimeout(() => {
    const inputArea = document.getElementById('chatInputArea');
    inputArea.innerHTML = '';

    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'card-options';

    options.forEach(option => {
      const card = document.createElement('div');
      card.className = 'card-option';
      card.innerHTML = `
        <div class="card-icon">${option.icon}</div>
        <div class="card-title">${option.title}</div>
        <div class="card-description">${option.description}</div>
      `;
      card.onclick = () => {
        addUserMessage(option.title);
        inputArea.innerHTML = '';
        if (onSelect) onSelect(option.value);
      };
      cardsDiv.appendChild(card);
    });

    inputArea.appendChild(cardsDiv);
  }, 1400);
}

function showSelectInput(options, onSelect) {
  setTimeout(() => {
    const inputArea = document.getElementById('chatInputArea');
    inputArea.innerHTML = '';

    const selectGroup = document.createElement('div');
    selectGroup.innerHTML = `
      <select class="select-input" id="selectInput">
        <option value="">Choose an option...</option>
        ${options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('')}
      </select>
      <button class="btn-send" onclick="submitSelect()">Continue →</button>
    `;

    inputArea.appendChild(selectGroup);
  }, 1400);
}

function submitSelect() {
  const select = document.getElementById('selectInput');
  const value = select.value;
  if (!value) return;

  const text = select.options[select.selectedIndex].text;
  addUserMessage(text);
  document.getElementById('chatInputArea').innerHTML = '';

  const step = steps.find(s => s.id === getCurrentStepId());
  if (step && step.onSelect) {
    step.onSelect(value);
  }
}

function showDateInputs(onComplete) {
  setTimeout(() => {
    const inputArea = document.getElementById('chatInputArea');
    inputArea.innerHTML = '';

    const isAnnual = conversation.data.coverType === 'annual';
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const dateGroup = document.createElement('div');
    dateGroup.className = 'date-picker-group';
    dateGroup.innerHTML = `
      <input type="date" class="date-input" id="startDate" min="${today}" value="${tomorrow}">
      ${!isAnnual ? '<input type="date" class="date-input" id="endDate" min="${tomorrow}">' : ''}
      <button class="btn-send" onclick="submitDates()">Continue →</button>
    `;

    inputArea.appendChild(dateGroup);

    if (!isAnnual) {
      document.getElementById('startDate').addEventListener('change', (e) => {
        const start = new Date(e.target.value);
        const defaultEnd = new Date(start);
        defaultEnd.setDate(defaultEnd.getDate() + 7);
        document.getElementById('endDate').value = defaultEnd.toISOString().split('T')[0];
        document.getElementById('endDate').min = e.target.value;
      });
    }
  }, 1400);
}

function submitDates() {
  const startDate = document.getElementById('startDate').value;
  if (!startDate) return;

  conversation.data.startDate = startDate;

  if (conversation.data.coverType === 'annual') {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    conversation.data.endDate = end.toISOString().split('T')[0];
    addUserMessage(`Starting ${new Date(startDate).toLocaleDateString('en-GB')} (1 year cover)`);
  } else {
    const endDate = document.getElementById('endDate').value;
    if (!endDate) return;
    conversation.data.endDate = endDate;
    addUserMessage(`${new Date(startDate).toLocaleDateString('en-GB')} - ${new Date(endDate).toLocaleDateString('en-GB')}`);
  }

  document.getElementById('chatInputArea').innerHTML = '';

  const step = steps.find(s => s.id === 'dates');
  if (step && step.onComplete) {
    step.onComplete();
  }
}

function showTravellerForm(onComplete) {
  setTimeout(() => {
    const inputArea = document.getElementById('chatInputArea');
    inputArea.innerHTML = '';

    const form = document.createElement('div');
    form.innerHTML = `
      <div id="travellerFields"></div>
      <button class="btn-send" onclick="submitTravellers()">All done! →</button>
    `;

    inputArea.appendChild(form);

    const fieldsDiv = document.getElementById('travellerFields');
    for (let i = 0; i < conversation.data.travellerCount; i++) {
      const maxDob = new Date();
      maxDob.setFullYear(maxDob.getFullYear() - 18);

      fieldsDiv.innerHTML += `
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px; color: #542E91;">Traveller ${i + 1}</div>
          <div style="display: grid; grid-template-columns: 0.5fr 1fr 1fr 1fr; gap: 8px;">
            <select class="select-input traveller-title" data-index="${i}" required>
              <option value="">Title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
              <option value="Miss">Miss</option>
            </select>
            <input type="text" class="text-input traveller-firstname" data-index="${i}" placeholder="First name" required>
            <input type="text" class="text-input traveller-lastname" data-index="${i}" placeholder="Last name" required>
            <input type="date" class="date-input traveller-dob" data-index="${i}" max="${maxDob.toISOString().split('T')[0]}" required>
          </div>
        </div>
      `;
    }
  }, 1400);

  window.submitTravellers = () => {
    const travellers = [];
    for (let i = 0; i < conversation.data.travellerCount; i++) {
      const title = document.querySelector(`.traveller-title[data-index="${i}"]`).value;
      const firstName = document.querySelector(`.traveller-firstname[data-index="${i}"]`).value;
      const lastName = document.querySelector(`.traveller-lastname[data-index="${i}"]`).value;
      const dob = document.querySelector(`.traveller-dob[data-index="${i}"]`).value;

      if (!title || !firstName || !lastName || !dob) {
        alert('Please fill in all traveller details');
        return;
      }

      travellers.push({ title, first_name: firstName, last_name: lastName, dob });
    }

    conversation.data.travellers = travellers;
    addUserMessage(`${travellers.length} ${travellers.length === 1 ? 'traveller' : 'travellers'} added ✓`);
    document.getElementById('chatInputArea').innerHTML = '';
    if (onComplete) onComplete();
  };
}

function nextStep(stepId) {
  const step = steps.find(s => s.id === stepId);
  if (step) {
    showStep(step);
  } else if (stepId === 'getQuote') {
    getQuote();
  }
}

function getCurrentStepId() {
  // Helper to find current step - not fully implemented for this demo
  return null;
}

async function getQuote() {
  document.getElementById('loadingOverlay').style.display = 'flex';

  try {
    // Call HAPI certificate API
    const sid = generateRandomHex(32);
    const certResponse = await fetch(
      `https://hapi.holidayextras.co.uk/insurance/certificates/new?token=4ad4966f-0b6a-49a9-8601-2a456aeb5c03&sid=${sid}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: conversation.data.startDate,
          to: conversation.data.endDate,
          destination_id: conversation.data.destId,
          agent: 'WT411',
          policySubtype: conversation.data.policySubtype,
          holidayValue: conversation.data.holidayValue,
          family_group_id: 1,
          country: 'GBR',
          cruise: false,
          email: null,
          unrecSend: 1,
          renewal: 0,
          people: conversation.data.travellers
        })
      }
    );

    if (certResponse.ok) {
      const certData = await certResponse.json();
      conversation.data.certificateID = certData.certificateID;
      conversation.data.hash = certData.insHash;
    }
  } catch (error) {
    console.error('Certificate API error:', error);
  }

  // Build redirect URL
  const isMedical = conversation.data.medicalConditions === 'yes';
  const baseUrl = 'https://www.holidayextras.com/static/?selectProduct=ins&#/insurance';
  const path = isMedical ? '/medicalScreening' : '';

  const params = new URLSearchParams({
    agent: 'WT411',
    ppts: '',
    customer_ref: '',
    annual_only: conversation.data.coverType === 'annual' ? '1' : '0',
    out: conversation.data.startDate,
    in: conversation.data.endDate,
    destination: '',
    destination_id: conversation.data.destId.toString(),
    travellers: conversation.data.travellers.length.toString(),
    renewal: '0',
    cruise: '0',
    winterSports: '0',
    carHireExcess: '0',
    unrecSend: '0',
    holidayValue: conversation.data.holidayValue.toString(),
    familyGroupID: '1',
    policySubtype: conversation.data.policySubtype
  });

  if (conversation.data.certificateID) {
    params.set('certificateID', conversation.data.certificateID.toString());
    params.set('hash', conversation.data.hash);
  }

  window.location.href = `${baseUrl}${path}?${params.toString()}`;
}

function calculateDestinationId() {
  const { coverType, region, europeHighRisk, worldwideUSA } = conversation.data;

  const destMap = {
    'single-UK': 1,
    'single-Europe-no': 6,
    'single-Europe-yes': 7,
    'single-ANZ': 4,
    'single-Worldwide-no': 5,
    'single-Worldwide-yes': 3,
    'annual-UK': 1,
    'annual-Europe': 7,
    'annual-ANZ': 5,
    'annual-Worldwide-no': 5,
    'annual-Worldwide-yes': 3
  };

  let key = `${coverType}-${region}`;
  if (region === 'Europe' && coverType === 'single') {
    key += europeHighRisk ? '-yes' : '-no';
  } else if (region === 'Worldwide') {
    key += worldwideUSA ? '-yes' : '-no';
  }

  conversation.data.destId = destMap[key] || 1;
}

function scrollToBottom() {
  const messagesContainer = document.getElementById('chatMessages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function generateRandomHex(length) {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
