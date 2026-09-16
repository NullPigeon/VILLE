import { SCRAPY_TOKEN } from '@/lib/scrapy-token';

export const GUIDE_NAME = 'SCRAPY FIELD GUIDE';
export const GUIDE_REVIEWED = 'September 16, 2026';
export type GuideSection = {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  table?: { headings: string[]; rows: string[][] };
};
export type GuideArticle = {
  slug: string;
  group: string;
  title: string;
  summary: string;
  destination?: string;
  sections: GuideSection[];
};

export const townDestinations = [
  {
    id: 'world',
    number: '01',
    title: 'World',
    href: '/world',
    description:
      'Explore the city, open community-built modules and like your favourites.',
    district: 'THE CITY',
    guide: 'world',
  },
  {
    id: 'chat',
    number: '02',
    title: 'Town Chat',
    href: '/chat',
    description:
      'Talk with citizens and ask Scrapy to turn your idea into a buildable proposal.',
    district: 'IDEAS START HERE',
    guide: 'town-chat',
  },
  {
    id: 'proposals',
    number: '03',
    title: 'Proposals',
    href: '/proposals',
    description:
      'Vote on what gets built next and follow ideas through the build queue.',
    district: 'CITIZENS DECIDE',
    guide: 'proposals',
  },
  {
    id: 'treasury',
    number: '04',
    title: 'Treasury',
    href: '/treasury',
    description:
      'Check the ETH pool, creator rewards and holder proposals for treasury funds.',
    district: 'THE PUBLIC LEDGER',
    guide: 'treasury',
  },
  {
    id: 'citizens',
    number: '05',
    title: 'Citizen File',
    href: '/citizens',
    description:
      'Create an account, link your wallet and manage your profile and voting power.',
    district: 'YOUR PLACE IN TOWN',
    guide: 'citizen-file',
  },
  {
    id: 'docs',
    number: '06',
    title: 'Field Guide',
    href: '/docs',
    description:
      'Learn how LANDVILLE works, what SCRAPY unlocks and how the builder creates modules.',
    district: 'THE TOWN MANUAL',
    guide: 'getting-started',
  },
] as const;

export const guideArticles: GuideArticle[] = [
  {
    slug: 'getting-started',
    group: 'Start here',
    title: 'Welcome to LANDVILLE',
    summary: 'A practical introduction to the town you build with an AI agent.',
    destination: '/',
    sections: [
      {
        id: 'what-it-is',
        title: 'A world built from community ideas',
        paragraphs: [
          'LANDVILLE is a shared digital town. Its buildings open interactive modules: community spaces, games, tools, galleries and other experiences proposed by citizens. A module is a working part of the website, with its own interface and a defined purpose.',
          'Scrapy is the town’s AI mayor and module builder. You discuss an idea with him, review a proposal, and let the community vote. A successful proposal moves into a reviewed build process. The resulting module joins World only after testing and release verification.',
        ],
      },
      {
        id: 'first-visit',
        title: 'Your first five minutes',
        paragraphs: [
          'You can explore the public pages before signing in. Create a citizen account when you want to participate.',
        ],
        items: [
          'Open World and select a building to see what citizens have created.',
          'Open Citizen File to sign in with email or a supported EVM wallet.',
          'Visit Town Chat. Use SEND to talk to citizens, or ASK SCRAPY for an AI reply.',
          'Describe a useful idea: what it does, how people use it, where it belongs and how it should look.',
          'Review the resulting plan before submitting it to Proposals. A chat message alone does not submit anything.',
        ],
      },
      {
        id: 'account-and-token',
        title: 'Do I need SCRAPY to join?',
        paragraphs: [
          'No. Every registered citizen can chat, propose modules and participate in build votes. Linking a wallet with SCRAPY adds voting power, weekly likes and holder benefits. ETH is the network gas currency; SCRAPY is the community token. They serve different purposes.',
          'Browsing, chat, likes and the platform’s votes do not require a blockchain transaction. A supported financial module asks you to review and sign its transaction in your own wallet.',
        ],
      },
      {
        id: 'find-your-way',
        title: 'Use the map or the guide',
        paragraphs: [
          'The home map links to the main destinations. World is the map of published community modules. This Field Guide explains each page and separates implemented capabilities, features awaiting activation, and future ideas. Roadmap entries are not a promise that those features are available today.',
        ],
      },
    ],
  },
  {
    slug: 'world',
    group: 'Explore the pages',
    title: 'World & community modules',
    summary:
      'Explore buildings, open modules and meet the town’s published residents.',
    destination: '/world',
    sections: [
      {
        id: 'explore',
        title: 'What you can do here',
        paragraphs: [
          'World brings published modules together on a city map. Select a building to inspect its title, creator and available actions, then open the module. The map grows as new releases are verified. A successful build or merged pull request does not by itself place an object on this map.',
          'Use the navigation menu to move to Town Chat, Proposals, Treasury, your profile or this guide. The home map is a directory of platform pages; World contains the experiences the community has built.',
        ],
      },
      {
        id: 'modules',
        title: 'Inside a building',
        paragraphs: [
          'Each published module has an address such as /modules/LV-6. The module’s own interface explains its controls. Some experiences work locally in your browser; others use reviewed platform services for saved data, market information, images or wallet actions.',
          'Sign in to open an interactive module, even if its interactions run only in your browser. Browsing the public World map does not require sign-in. A module should show when it is loading, when an operation has failed, and when a save has completed. A visual preview is not proof that data was saved.',
        ],
      },
      {
        id: 'likes',
        title: 'Support the modules you enjoy',
        paragraphs: [
          'You can like published modules you did not create. Your weekly allowance starts at five and grows with SCRAPY holdings. A like is a permanent expression of support, separate from the vote that decided whether the module should be built.',
          'One citizen can like a particular module once, not once every week. The allowance resets; the module’s existing likes do not disappear. See Weekly likes for the full rules.',
        ],
      },
      {
        id: 'residents',
        title: 'Your character in the city',
        paragraphs: [
          'A module with character-generation and World-publishing permissions can let you choose a generated avatar and publish it as your World resident. LANDVILLE asks for confirmation before making the selected image and username public.',
          'Each citizen has one published resident. Publishing a new choice replaces it, and you can remove it through the supported module controls. Residents currently remain on the map until changed or removed: they are not a live online-status indicator, and they do not automatically walk around.',
        ],
      },
    ],
  },
  {
    slug: 'town-chat',
    group: 'Explore the pages',
    title: 'Town Chat & proposing ideas',
    summary:
      'From an ordinary conversation to a proposal you explicitly approve.',
    destination: '/chat',
    sections: [
      {
        id: 'public-chat',
        title: 'A shared public conversation',
        paragraphs: [
          'Town Chat is shared and saved. Citizens see the same messages, Scrapy replies and confirmed build updates. Anyone can read the town; you need an account to post.',
          'SEND, including Enter in the composer, posts a message to other citizens. ASK SCRAPY explicitly requests an AI reply in public. Scrapy does not automatically respond to every ordinary message. Replies are labelled so you can distinguish an AI response from a scripted fallback.',
        ],
      },
      {
        id: 'useful-brief',
        title: 'Give Scrapy a useful brief',
        paragraphs: [
          'You do not need to write code. Describe the outcome and the choices a visitor should have. Scrapy can ask for missing details before preparing a proposal.',
        ],
        items: [
          'Purpose: who will use it and what problem or experience it provides.',
          'Functions: what the buttons do, what users enter and what results they see.',
          'Data: what should be private, shared or saved for a later visit.',
          'Placement and appearance: the kind of building and visual style you have in mind.',
          'Success: a few concrete behaviours that should work when the module is tested.',
        ],
      },
      {
        id: 'submit',
        title: 'Review before submitting',
        paragraphs: [
          'A proposal-ready AI plan can show REVIEW & PROPOSE to the citizen who requested it. Open that control, check the title and summary, and confirm submission. Until you do this, the discussion remains a discussion.',
          'Any citizen can submit without a minimum SCRAPY balance. You can have up to two active proposals. LIVE, PASSED and BUILDING all count; another slot becomes available when one is built or rejected.',
        ],
      },
      {
        id: 'chat-quota',
        title: 'Daily limits and private archives',
        paragraphs: [
          'Without SCRAPY, your account gets 10 messages per UTC day. A positive SCRAPY balance in your linked wallet raises this to 50. Both ordinary messages and requests to Scrapy use your posting allowance; Scrapy’s replies do not. The allowance resets at 00:00 UTC.',
          'Old private Workshop conversations remain available at /chat/archive after sign-in. That page is read-only. Those messages were not copied into public Town Chat. Never put a seed phrase, private key or other secret into a conversation.',
        ],
      },
    ],
  },
  {
    slug: 'proposals',
    group: 'Explore the pages',
    title: 'Proposals & build voting',
    summary:
      'Understand voting power, the five-participant rule and the route into the build queue.',
    destination: '/proposals',
    sections: [
      {
        id: 'cast-vote',
        title: 'Vote on the idea that will be built',
        paragraphs: [
          'The Proposals page lists community ideas and their progress. Read the proposed behaviour before voting YES or NO. Votes are recorded against your citizen identity with a snapshot of the voting power used.',
          'A build vote lasts two hours. It passes only if at least five distinct citizen accounts have voted and total YES voting power exceeds NO voting power. Five weighted votes from one person are not five participants. A tie, no votes or fewer than five participants does not pass.',
        ],
      },
      {
        id: 'weight',
        title: 'How voting power is calculated',
        paragraphs: [
          'Every citizen starts with one vote of power. Each complete 250,000 SCRAPY in the linked wallet adds one. The formula is 1 + floor(SCRAPY balance / 250,000). A balance below the next complete threshold does not add a partial vote.',
          'For build proposals, holdings are checked when you vote. The recorded receipt includes the block and token balance used. This is token-weighted community voting, not a claim that each account represents a unique real-world person.',
        ],
      },
      {
        id: 'statuses',
        title: 'What the statuses mean',
        paragraphs: [
          'Voting and building are separate stages. Several votes can be open at once, while reviewed builds are processed one at a time.',
        ],
        table: {
          headings: ['Status', 'Meaning'],
          rows: [
            [
              'LIVE',
              'The voting window is open, or its result is awaiting finalisation.',
            ],
            [
              'PASSED',
              'The vote passed; the idea awaits technical review and its place in the queue.',
            ],
            [
              'BUILDING',
              'The proposal is in the build/review workflow; it is not necessarily released.',
            ],
            [
              'BUILT',
              'The module has passed release verification and is published in World.',
            ],
            [
              'REJECTED',
              'The vote did not pass, or the proposal was rejected in review.',
            ],
          ],
        },
      },
      {
        id: 'after-voting',
        title: 'What happens after the deadline',
        paragraphs: [
          'The coordinator finalises expired votes. The displayed state can take time to update after the deadline, but late votes are rejected. Passed proposals are ordered for the build queue and need an operator’s technical review.',
          'A passing vote approves the idea; it does not guarantee an instant release. Scrapy builds within the supported capabilities, automated checks run, and a human tests the result. Failed attempts can require a repair or an operator-approved retry.',
        ],
      },
    ],
  },
  {
    slug: 'citizen-file',
    group: 'Explore the pages',
    title: 'Your citizen account',
    summary:
      'Sign in, edit your profile, link a wallet and check your participation.',
    destination: '/citizens',
    sections: [
      {
        id: 'join',
        title: 'Email or wallet sign-in',
        paragraphs: [
          'Citizen File is the account entry point. You can start with an email login or a supported EVM wallet. An email account can link a wallet later for token-based benefits. A wallet sign-in asks for a message signature; it is not a payment or a token approval.',
          'Your citizen identity holds your profile, proposals and activity. Your linked wallet is used to check token holdings and, where supported, request financial transactions. Check that you are viewing your own account before editing it.',
        ],
      },
      {
        id: 'profile',
        title: 'Your public file',
        paragraphs: [
          'Set a username, bio and profile avatar. Other citizens can open your public profile from chat or community activity to see your public information and recorded contributions.',
          'Public profile links use /citizens/<identity>. Private email details and the old private chat archive are not part of that public page. A profile avatar and a published World character are separate features.',
        ],
      },
      {
        id: 'holdings',
        title: 'Check SCRAPY voting power',
        paragraphs: [
          'Use CHECK VOTING POWER to refresh your linked wallet’s SCRAPY balance and inspect the resulting weight. ADD $SCRAPY TO WALLET asks your wallet to display the official token; it does not buy tokens or add funds.',
          'If your holdings do not appear, first check the linked address and network. A balance on another chain or a different token contract does not count. A network error should be treated as unavailable information, not a confirmed zero balance.',
        ],
      },
      {
        id: 'records',
        title: 'Follow your contributions',
        paragraphs: [
          'Your file links back to proposals and recorded activity. Use it to find the ideas you submitted and, on your own profile, your vote receipts. Follow proposal status in Proposals and actual published experiences in World.',
        ],
      },
    ],
  },
  {
    slug: 'treasury',
    group: 'Explore the pages',
    title: 'Treasury & creator rewards',
    summary:
      'Read the ETH balance, reward ledger and holder decisions without confusing a vote with a payment.',
    destination: '/treasury',
    sections: [
      {
        id: 'pool',
        title: 'The treasury page',
        paragraphs: [
          'Treasury shows the public treasury wallet, its ETH balance, creator-reward policy, reward ledger and treasury proposals. You can open the wallet or a paid reward in the chain explorer. The displayed pool is ETH; tokens received as fees are not automatically converted to ETH.',
          'Treasury is a wallet with a server-side reward-payment system, not a fully autonomous DAO contract. Scrapy’s generated modules do not receive its private key. The operator controls the wallet and enables the separate reward-payment service.',
        ],
      },
      {
        id: 'rewards',
        title: 'When a creator becomes eligible',
        paragraphs: [
          'A reward record is created when a new module is first verified and published in World. The recipient is the wallet linked to the author of the idea. There is no separate reward vote.',
          'The creator must hold the configured SCRAPY minimum when eligibility is checked. The initial threshold is 1,000,000 SCRAPY; check the live Treasury page because an approved policy proposal can change it. This is an eligibility snapshot, not a continuous-locking requirement.',
          'The reward is the smaller of 0.005 ETH or 1% of available treasury ETH under the reward system. Rebuilds, bug fixes and later revisions do not earn another reward. Payouts also require funds, an enabled payment service and successful processing; an eligible record is not proof of payment.',
        ],
      },
      {
        id: 'ledger',
        title: 'Read the reward ledger',
        paragraphs: [
          'The ledger records the held balance used for eligibility, the reward amount, current status and a transaction link when available.',
        ],
        table: {
          headings: ['Status', 'Meaning'],
          rows: [
            [
              'CHECKING ELIGIBILITY',
              'The service has not finished checking the creator’s linked wallet.',
            ],
            [
              'INELIGIBLE',
              'The recorded check did not satisfy the reward requirements.',
            ],
            [
              'WAITING FUNDS / READY',
              'Payment is waiting for funding or processing.',
            ],
            [
              'PAYMENT PENDING',
              'The payout has entered transaction processing.',
            ],
            ['PAID', 'The ledger records a completed reward payment.'],
            [
              'PAYMENT REVIEW',
              'An uncertain or problematic payment needs operator review.',
            ],
          ],
        },
      },
      {
        id: 'decisions',
        title: 'Holder proposals and 48-hour votes',
        paragraphs: [
          'SCRAPY holders can propose uses for treasury funds or a change to the creator-reward holding threshold. Treasury voting uses holdings at the proposal’s recorded snapshot block, rather than buying additional weight during the vote.',
          'Only one treasury vote is live at a time. Others queue. Each lasts 48 hours, with no quorum: YES must exceed NO and there must be positive YES power. If an ETH amount is requested, it cannot exceed 10% of the balance observed when the proposal is filed. There is no additional 24-hour cooldown between proposals.',
          'A passed REWARD_POLICY proposal changes the configured holding threshold. A passed purchase, staking, distribution or other free-form proposal records the community decision; it does not automatically execute an arbitrary transaction. Those actions require a separately supported execution path.',
        ],
      },
    ],
  },
  {
    slug: 'scrapy-token',
    group: 'Token & participation',
    title: 'What SCRAPY does today',
    summary:
      'The exact token benefits, formulas and limits in the current platform.',
    sections: [
      {
        id: 'identity',
        title: 'The official token',
        paragraphs: [
          `SCRAPY is the community token on Robinhood Mainnet, chain ID 4663. Its official contract is ${SCRAPY_TOKEN.address}. The on-chain token name is LANDVILLE; the community ticker is $SCRAPY. Verify the contract address rather than relying on a name or symbol.`,
          'Your tokens stay in your linked wallet. The participation features read your balance; they do not stake, lock or spend SCRAPY. ETH, not SCRAPY, pays network gas.',
        ],
      },
      {
        id: 'benefits',
        title: 'Current benefits',
        paragraphs: [
          'Holding SCRAPY changes participation allowances and reward eligibility. It is not required to browse the town or submit a build idea.',
        ],
        table: {
          headings: ['Feature', 'Without SCRAPY', 'With SCRAPY'],
          rows: [
            [
              'Build proposals',
              'Up to two active proposals',
              'Same proposal access',
            ],
            ['Build voting power', '1', '+1 for each full 250,000 SCRAPY'],
            ['Weekly module likes', '5', '+1 for each full 250,000 SCRAPY'],
            ['Daily chat messages', '10', '50 with any positive balance'],
            [
              'Treasury proposals and voting',
              'Read-only participation',
              'Holder access, with voting snapshot rules',
            ],
            [
              'Creator-reward eligibility',
              'Not eligible under initial policy',
              'Initially at least 1,000,000 SCRAPY; live policy applies',
            ],
          ],
        },
      },
      {
        id: 'examples',
        title: 'Examples of voting power and likes',
        paragraphs: [
          'These are total allowances, not multipliers on every click. Each like adds one to a module; holdings give you more likes to distribute across different modules.',
        ],
        table: {
          headings: ['SCRAPY held', 'Build voting power', 'Weekly likes'],
          rows: [
            ['0', '1', '5'],
            ['249,999', '1', '5'],
            ['250,000', '2', '6'],
            ['500,000', '3', '7'],
            ['1,000,000', '5', '9'],
          ],
        },
      },
      {
        id: 'not-included',
        title: 'What holding does not currently provide',
        paragraphs: [
          'Holding SCRAPY does not currently create automatic staking yield, a claim on treasury assets, automatic fee distributions, or a guaranteed creator payment. Treasury proposals about these ideas are not the same as implemented financial products.',
          'A holder still needs a passing build vote and a verified first release for creator-reward consideration. Increasing your voting weight does not replace the requirement for five distinct participants in a build vote.',
        ],
      },
    ],
  },
  {
    slug: 'weekly-likes',
    group: 'Token & participation',
    title: 'Weekly module likes',
    summary:
      'Five likes per week, holder bonuses and permanent support for different modules.',
    destination: '/world',
    sections: [
      {
        id: 'allowance',
        title: 'Your weekly allowance',
        paragraphs: [
          'Every registered citizen starts with five likes per UTC week. Each full 250,000 SCRAPY in the linked wallet adds one: 5 + floor(SCRAPY balance / 250,000). The server checks the eligible allowance when a new like is submitted.',
          'Weeks reset on Monday at 00:00 UTC. Unspent likes do not accumulate into an unlimited balance. Changing a device or refreshing the page does not reset your usage.',
        ],
      },
      {
        id: 'rules',
        title: 'Where you can spend them',
        paragraphs: [
          'Open a published module from World and use its like action. Your own modules cannot receive your likes. A module can receive one like from your citizen account in total, even after the next week begins.',
          'Likes already recorded remain on the module. Clicking the same action again does not create another like or spend another allowance unit. There is no unlike action in the current feature.',
        ],
      },
      {
        id: 'meaning',
        title: 'Likes are not build votes',
        paragraphs: [
          'A build vote decides whether a proposed idea should enter the reviewed build queue. A like supports a module that is already published. Likes do not automatically pay the creator, move treasury funds or approve a new revision.',
        ],
      },
    ],
  },
  {
    slug: 'builder',
    group: 'How Scrapy works',
    title: 'From chat to a working module',
    summary:
      'What the AI builds, what the platform controls and why human review remains in the process.',
    sections: [
      {
        id: 'two-roles',
        title: 'The mayor and the builder',
        paragraphs: [
          'Scrapy has two related roles. In Town Chat, the AI helps you explain and refine an idea. The builder is a separate background workflow that turns a reviewed, approved proposal into a module. A conversational reply is not a build command.',
          'Most of the module’s interface and client-side behaviour are produced by the coding agent. The platform supplies the runtime, approved services, account system, permissions, checks and release process. Scrapy is a bounded module-building agent; it cannot freely rewrite every part of the platform.',
        ],
      },
      {
        id: 'pipeline',
        title: 'The development process',
        paragraphs: [
          'The workflow connects community decisions to actual code in GitHub.',
        ],
        items: [
          'Discuss: the citizen and Scrapy make the purpose, functions, placement and visual direction concrete.',
          'Confirm: the citizen reviews the plan and submits the proposal.',
          'Vote: the community votes for two hours; five participants and YES > NO are required.',
          'Review: an operator checks technical feasibility and defines acceptance checks without replacing the approved goal.',
          'Build: a trusted coordinator claims one reviewed job and sends the specification to the OpenAI Responses API. Agent passes work on architecture, implementation, creative review and repairs when needed.',
          'Open a PR: the controller saves the generated module artifact on a dedicated GitHub branch and opens a pull request. The model does not receive repository credentials.',
          'Test: automated checks validate the artifact and application; a human tests the actual interactions and acceptance criteria.',
          'Publish: after merge and production deployment, the operator starts release verification. Only a verified release creates the World object.',
        ],
      },
      {
        id: 'artifact',
        title: 'What the builder produces',
        paragraphs: [
          'A module artifact contains its title, HTML, styles, browser-side code, acceptance criteria and declared capabilities. LANDVILLE runs it in an isolated frame. The artifact is treated as content, not imported as trusted server code.',
          'Persistent state, generation and transactions go through a controlled connection to the host platform. The module requests a supported action; the host validates identity and permissions and returns a result. A request cannot grant itself a new capability.',
        ],
      },
      {
        id: 'review',
        title: 'Why checks and publication are separate',
        paragraphs: [
          'Compiling successfully does not prove a button behaves correctly, a result is useful or an interface is readable. That is why the workflow includes human acceptance testing in addition to automated checks.',
          'Release verification checks the merged PR, its checks, the production deployment and the exact packaged artifact. Rebuilds have revisions and reviewed attempts. An earlier verified module can remain live while a replacement is prepared.',
        ],
      },
      {
        id: 'failures',
        title: 'What happens when a build fails',
        paragraphs: [
          'Generation can time out, output can violate the artifact contract, automated checks can fail, or an interaction can fail human review. These are different failure stages and need different fixes.',
          'Operators inspect the workflow and any existing PR before retrying. Paid attempts are bounded. A failed or incomplete attempt should not be described as a published building, and repeatedly requesting a rebuild does not bypass the review process.',
        ],
      },
    ],
  },
  {
    slug: 'module-capabilities',
    group: 'How Scrapy works',
    title: 'What modules can do',
    summary:
      'Supported building blocks and examples of experiences they can power.',
    sections: [
      {
        id: 'experiences',
        title: 'Types of experiences',
        paragraphs: [
          'Scrapy can combine interface code and approved capabilities to build mini-games, interactive galleries, calculators, community boards, quizzes, idea collections, avatar tools and information dashboards. These are categories of possible builds, not a claim that every example is already published.',
          'A good proposal states which information must be saved and which external service is needed. An attractive interface cannot make an unsupported service work.',
        ],
        table: {
          headings: ['Building block', 'Examples', 'Boundary'],
          rows: [
            [
              'Browser interactions',
              'Puzzles, calculators, interactive stories',
              'No unrestricted backend or network access',
            ],
            [
              'Private storage',
              'Preferences, a saved character brief, personal progress',
              'Data belongs to the signed-in citizen within that module',
            ],
            [
              'Shared storage and counters',
              'Community boards, entries, simple rankings',
              'Reviewed collections; authors control their own records',
            ],
            [
              'Market and chain reads',
              'Token explorers, balance viewers, market dashboards',
              'Approved DEX Screener and Robinhood read requests',
            ],
            [
              'Image generation',
              'Avatar forges, personalised visual tools',
              'Reviewed purpose, enabled service and weekly quota',
            ],
            [
              'World residents',
              'Publish a selected generated character',
              'Explicit confirmation; one resident per citizen',
            ],
            [
              'Wallet adapter',
              'Direct ERC-20 swap interfaces',
              'Reviewed permissions and operator activation required',
            ],
          ],
        },
      },
      {
        id: 'state',
        title: 'Persistence is part of the proposal',
        paragraphs: [
          'Private storage saves an object for one citizen. Shared storage exposes public records while restricting edits and deletes to their author. Counters support simple shared counts. Each module declares the collections it needs.',
          'This storage can support game progress or scores, but a score submitted by browser code is not automatically cheat-proof. Competitive games with valuable prizes require additional server-side validation and a reviewed reward mechanism.',
        ],
      },
      {
        id: 'ai',
        title: 'AI generation inside a module',
        paragraphs: [
          'The builder uses AI to write the module, but that does not automatically give the resulting module access to every AI service. Runtime image generation is an explicit supported capability. Town Chat has its own AI connection.',
          'General-purpose text-generation endpoints inside arbitrary modules, live voice, audio generation and video generation are not in the current module capability set. A scripted character or template-based text tool should not be presented as a live AI agent.',
        ],
      },
    ],
  },
  {
    slug: 'avatars',
    group: 'How Scrapy works',
    title: 'Images & World characters',
    summary:
      'Generate a character, understand the quota and publish a selected image.',
    destination: '/world',
    sections: [
      {
        id: 'generation',
        title: 'Describe your character',
        paragraphs: [
          'Open a published generation module and describe the subject you want. Where the module provides style, mood, clothing or other options, they add to the brief. The visual direction should fit LANDVILLE while keeping the character you requested recognisable.',
          'A human, robot, superhero or creature can be a subject. Generation is provided by an external image service and can fail or be declined. The platform cannot guarantee that every prompt or every named character will be generated exactly as requested.',
        ],
      },
      {
        id: 'limits',
        title: 'One successful batch per week',
        paragraphs: [
          'The host permits one successful generation batch per citizen, per module, per UTC week. A reviewed module can request one image or three choices. Reopening that module returns the saved batch rather than charging for a new one.',
          'A generation can take time. Read its pending or error state before trying again. Changing the brief after a successful batch does not automatically grant another batch. The current brief limit is 1,000 characters; module-specific controls can be narrower.',
        ],
      },
      {
        id: 'publish',
        title: 'Publish only the image you choose',
        paragraphs: [
          'In a module with World-publishing permission, select one returned image and use its publish control. LANDVILLE asks for confirmation. The chosen image and username become public on World.',
          'The map displays the character at a small size. Publishing does not mint an NFT, create a transferable asset or make a live animated player. The resident persists when you leave; online-only presence and walking animation are future enhancements.',
        ],
      },
      {
        id: 'preview',
        title: 'Preview and release are different',
        paragraphs: [
          'An admin preview can use simulated storage that resets when the tab is reloaded. Always read its preview notice. A preview’s temporary state should not be mistaken for a saved production profile or a verified World publication.',
        ],
      },
    ],
  },
  {
    slug: 'transactions',
    group: 'How Scrapy works',
    title: 'Wallet transactions & fees',
    summary:
      'The first adapter supports direct Uniswap V3 swaps; other financial actions are future work.',
    sections: [
      {
        id: 'availability',
        title: 'Implemented adapter, controlled activation',
        paragraphs: [
          'The first LANDVILLE transaction adapter is deployed on Robinhood Mainnet. It supports a direct, single-pool ERC-20 to ERC-20 swap through Uniswap V3. The module must declare its transaction permissions and the operator must enable wallet transactions before requests can run.',
          'At the time of this guide’s review, production activation and a published swap-module end-to-end test have not been confirmed. Contract deployment alone does not mean a live swap page is available. Look for a reviewed module in World and its actual availability message.',
        ],
      },
      {
        id: 'flow',
        title: 'What a supported swap asks you to do',
        paragraphs: [
          'The module requests a quote, shows the trade and fee information, then asks for the required exact-amount approval and a separate swap confirmation. LANDVILLE constructs the permitted transaction; your linked wallet signs it.',
          'Token addresses, gross input, treasury fee, amount being swapped, pool fee and slippage should be visible before you decide. A quote is not a completed trade. Check the transaction receipt in the explorer to confirm the on-chain result.',
        ],
      },
      {
        id: 'fee',
        title: 'Where the 1% fee goes',
        paragraphs: [
          'The router sends 1% of the input token to its fixed treasury address and swaps the remaining 99%. The purchased token goes to the caller’s wallet. Uniswap’s pool fee and network gas are separate costs.',
          'For example, with 100 input tokens, the platform fee is 1 input token and 99 enter the swap. The output amount depends on the pool and slippage. The fee is not automatically converted to ETH, so receiving token fees does not directly increase the Treasury page’s ETH balance.',
        ],
      },
      {
        id: 'limits',
        title: 'What is not supported yet',
        paragraphs: [
          'Native ETH input/output, multi-hop routing, automatic trades, arbitrary transfers, staking, minting and NFT purchases are outside the first adapter. ERC-20 trading also depends on a supported liquid pool and token behaviour; not every token or RWA is tradable.',
          'Scrapy can design a concept for another type of transaction, but that action needs its own reviewed integration before it can execute. Generated modules never receive the treasury key, wallet private key or an unrestricted contract-call interface.',
        ],
      },
      {
        id: 'addresses',
        title: 'Deployment references',
        paragraphs: [
          'Network: Robinhood Mainnet, chain ID 4663. LANDVILLE fee router: 0x92a9a8308eD793D59c2653773F296F73BA9085B3.',
          'Treasury: 0xfF088b1aD9f15cd464593d995b2b37E71F133918. Upstream Uniswap SwapRouter02: 0xCaf681a66D020601342297493863E78C959E5cb2. These are public contract/wallet references, never private keys.',
        ],
      },
    ],
  },
  {
    slug: 'roadmap',
    group: 'What comes next',
    title: 'The next building blocks',
    summary:
      'Planned directions and additional ideas, clearly separated from today’s capabilities.',
    sections: [
      {
        id: 'status',
        title: 'How to read this roadmap',
        paragraphs: [
          'The items below are proposed development directions. They are not active features or dated release commitments. Each needs an implementation, an appropriate runtime capability, tests and release approval before Scrapy can offer it in a working module.',
        ],
      },
      {
        id: 'media',
        title: 'Video, audio and richer AI tools',
        paragraphs: [
          'We want to expand the creative services modules can use. Potential experiences include short-video studios, animated character tools, voice generators, sound-effect workshops and music-making spaces.',
          'General-purpose text generation and interactive AI characters could also become explicit module services. These integrations need clear quotas, saved outputs, progress and failure states, and understandable usage rules. They do not become available just because the builder can write their interface.',
        ],
      },
      {
        id: 'financial',
        title: 'More types of wallet transactions',
        paragraphs: [
          'Staking, minting, NFT and supported RWA purchases, tips, transfers and reward distributions are candidate additions. Each transaction type needs a narrow, reviewed integration with a specific protocol.',
          'A marketplace might combine listings, purchases and fees; a staking interface might add deposits, withdrawals and reward claims. These are separate operations to implement, rather than one generic permission to move money. Yield and treasury distributions are not current holder entitlements.',
        ],
      },
      {
        id: 'city',
        title: 'A more expressive World',
        paragraphs: [
          'Possible city upgrades include an animated Scrapy mayor, resident movement, online-presence indicators, seasonal decorations and themed districts. A presence system would distinguish a published character from someone actively visiting.',
          'Other ideas worth exploring: a town events calendar, a community radio with a supported audio source, collaborative stories, an idea remix board, a creator showcase and a directory of useful modules.',
        ],
      },
      {
        id: 'progress',
        title: 'Reputation and cooperative play',
        paragraphs: [
          'Quests, contribution badges, team challenges and reputation could make participation easier to follow. Competitive scores and valuable rewards would require stronger server-side validation than a browser-submitted score.',
          'Bring a proposal to Town Chat with a small first version. Scrapy can help separate what works with the current capabilities from what needs a platform upgrade.',
        ],
      },
    ],
  },
  {
    slug: 'links',
    group: 'Reference',
    title: 'Page links & short descriptions',
    summary:
      'Copy-ready descriptions for sharing LANDVILLE one page at a time.',
    sections: [
      {
        id: 'main-pages',
        title: 'The main destinations',
        paragraphs: [
          'The cards below provide a short English description and the full link to each page. Use them individually in a tweet or together as a short introduction thread.',
        ],
      },
      {
        id: 'other-pages',
        title: 'Additional destinations',
        paragraphs: [
          'Published experiences have individual /modules/<module-id> links; copy the address of a module you actually opened from World. Citizen profiles similarly have individual /citizens/<identity> links.',
          'The legacy /mayor address redirects to Town Chat. /chat/archive is your signed-in, read-only private Workshop archive. /admin and its build-preview pages are operator tools, not public proposal shortcuts.',
        ],
      },
      {
        id: 'external',
        title: 'Project and chain references',
        paragraphs: [
          'GitHub hosts the application and generated module code. The Robinhood explorer lets you inspect token, wallet and transaction records. The official token and deployed router addresses are documented in their respective guide chapters.',
        ],
      },
    ],
  },
  {
    slug: 'help',
    group: 'Reference',
    title: 'Help & common questions',
    summary:
      'Find the next useful step when a proposal, generation or module is not behaving as expected.',
    sections: [
      {
        id: 'no-proposal',
        title: 'Why is my chat idea not in Proposals?',
        paragraphs: [
          'A message is not a submitted proposal. Ask Scrapy to make the purpose, functions, placement and visual direction concrete. When a proposal-ready reply offers REVIEW & PROPOSE, check the draft and explicitly submit it. Your account must also have an available active-proposal slot.',
        ],
      },
      {
        id: 'not-world',
        title: 'The build passed. Why is it not in World?',
        paragraphs: [
          'A passed vote, a successful workflow and a merged PR are different milestones. The module appears only after the correct production deployment is ready and an operator completes verified publication. A technical issue can keep it in review even after a merge.',
        ],
      },
      {
        id: 'limits',
        title: 'Why can I not like or generate again?',
        paragraphs: [
          'For likes, check your remaining weekly allowance, whether you created the module and whether you already liked it in an earlier week. For image generation, check whether this module already returned your successful batch for the current UTC week.',
          'If a service is unavailable, read the error message and try again after the connection recovers. Changing a prompt or reloading does not reset a successful weekly generation.',
        ],
      },
      {
        id: 'wallet',
        title: 'My balance or wallet transaction is unavailable',
        paragraphs: [
          'Check the wallet linked to your citizen account, the Robinhood Mainnet network and the official SCRAPY contract. Wallet login and a spend approval are different actions. Never send a seed phrase or private key to Scrapy or support.',
          'The swap adapter also needs operator activation, a published module with approved permissions and a usable pool. A disabled-feature message cannot be fixed by repeatedly approving tokens.',
        ],
      },
      {
        id: 'report',
        title: 'Report a useful problem',
        paragraphs: [
          'Include the page or module address, what you clicked, what you expected and the exact visible error. A screenshot can help explain layout problems. Do not include private keys, recovery phrases, login codes or private conversations.',
          'Public Town Chat is suitable for a non-sensitive question. Operators can inspect private build logs and release checks. They should investigate a failure before consuming another paid build attempt.',
        ],
      },
    ],
  },
];

export function findGuide(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}
