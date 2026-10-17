import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LuArrowRight, LuBackpack, LuCalendarDays, LuCloudRain, LuGripVertical, LuMap, LuMessagesSquare,
  LuReceipt, LuSparkles, LuThumbsUp, LuUsers, LuWallet, LuGithub,
} from 'react-icons/lu'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/api'
import Button from '../components/ui/Button'
import Logo from '../components/ui/Logo'
import { Avatar } from '../components/ui/Avatar'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { usePageTitle } from '../lib/usePageTitle'

const features = [
  { icon: LuSparkles, title: 'AI itineraries that read the forecast', body: 'Groq-powered plans built around your dates, interests and budget, with outdoor plans moved off the rainy days.' },
  { icon: LuBackpack, title: 'Packing lists with reasons', body: 'Not just "bring a jacket". Every item says why: wind speed on day 2, UV index at midday, the sockets at your destination.' },
  { icon: LuUsers, title: 'Plan together', body: 'Invite friends as editors or viewers. Everyone sees the same itinerary and votes on activities.' },
  { icon: LuWallet, title: 'Shared budget and settle-up', body: 'Log expenses in any currency, split them evenly or by share, and see the fewest transfers to square up.' },
  { icon: LuMap, title: 'Every day on a map', body: 'Activities plotted per day with the route between them, so you can spot a plan that zig-zags across the city.' },
  { icon: LuGripVertical, title: 'Edit by dragging', body: 'Reorder activities, move them between days, or ask the AI to regenerate a single day.' },
]

const steps = [
  { title: 'Tell it where and when', body: 'Destination, dates, budget, who is coming and what you are into.' },
  { title: 'Get a plan in seconds', body: 'A day-by-day itinerary, packing list and budget split, checked against the live forecast.' },
  { title: 'Travel as a group', body: 'Tweak the plan together, chat with the assistant and track spending as you go.' },
]

const faqs = [
  { q: 'Do I need to sign up to try it?', a: 'No. "Try the live demo" signs you in as a sample traveller with a group trip already set up. You can switch between the four demo travellers to see the trip from each side.' },
  { q: 'Which AI does it use?', a: 'Itineraries, packing lists and the trip assistant run on Groq. If the AI is unavailable, a rule-based planner takes over so the app keeps working.' },
  { q: 'Where does the weather and currency data come from?', a: 'OpenWeatherMap for forecasts, OpenTripMap for attractions and ExchangeRate-API for currency conversion.' },
  { q: 'Is this a real product?', a: 'It is a portfolio project. The demo data resets periodically, so do not store anything you want to keep.' },
]

// Coded product mock-up for the hero. Content is illustrative sample data.
const HeroPreview = () => (
  <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
    <div className="absolute -inset-6 rounded-[2rem] bg-brand-500/20 blur-3xl" />
    <div className="relative rounded-2xl border border-white/10 bg-surface p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">Day 2 - Cape Peninsula</p>
          <p className="text-base font-bold tracking-tight text-slate-900">Cape Town long weekend</p>
        </div>
        <div className="flex -space-x-2">
          {[['AM', '#0f766e'], ['LD', '#e11d48'], ['SP', '#7c3aed']].map(([i, c]) => (
            <Avatar key={i} user={{ first_name: i[0], last_name: i[1], avatar_color: c }} size="sm" />
          ))}
        </div>
      </div>
      <ol className="mt-4 space-y-2.5">
        {[
          ['08:30', 'Cape Point lighthouse', 'Nature', 5],
          ['13:00', 'Boulders Beach penguins', 'Nature', 3],
          ['19:00', 'Seafood dinner in Kalk Bay', 'Food', 2],
        ].map(([time, title, tag, votes]) => (
          <li key={title} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <span className="w-11 text-xs font-semibold tabular-nums text-slate-500">{time}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
              <span className="text-xs text-slate-500">{tag}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              <LuThumbsUp className="size-3" /> {votes}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-start gap-3 rounded-xl bg-brand-50 p-3">
        <LuCloudRain className="mt-0.5 size-4 shrink-0 text-brand-700" />
        <p className="text-xs leading-relaxed text-brand-900">
          <span className="font-semibold">Pack a windproof jacket.</span> Gusts of 45 km/h are forecast at Cape Point in the morning.
        </p>
      </div>
    </div>
    <div className="relative -mt-4 ml-auto mr-6 hidden w-56 rounded-2xl border border-slate-200 bg-surface p-4 shadow-xl sm:block">
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><LuReceipt className="size-3.5" /> Settle up</p>
      <p className="mt-2 text-sm text-slate-700"><span className="font-semibold text-slate-900">Sam</span> pays <span className="font-semibold text-slate-900">Alex</span></p>
      <p className="text-lg font-bold tracking-tight text-slate-900">R 1,330</p>
    </div>
  </div>
)

const Landing = () => {
  usePageTitle(null)
  const { user, loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState('')

  const startDemo = async () => {
    setDemoError('')
    setDemoLoading(true)
    try {
      await loginAsDemo()
      navigate('/dashboard')
    } catch (error) {
      setDemoError(getErrorMessage(error, 'The demo is unavailable right now'))
      setDemoLoading(false)
    }
  }

  const demoButton = (variant = 'inverse') => (
    <Button size="lg" variant={variant} onClick={startDemo} loading={demoLoading}>
      Try the live demo <LuArrowRight className="size-4" aria-hidden />
    </Button>
  )

  return (
    <div className="bg-surface">
      <a href="#main" className="sr-only z-50 rounded-lg bg-surface px-4 py-2 font-semibold text-slate-900 shadow-lg ring-2 ring-brand-600 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <header className="keep-colors sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo inverse />
          <nav className="flex items-center gap-2" aria-label="Account">
            <ThemeSwitcher inverse className="hidden md:inline-flex" />
            {user ? (
              <Button as={Link} to="/dashboard" size="sm" variant="inverse">Open my trips</Button>
            ) : (
              <>
                <Button as={Link} to="/login" size="sm" variant="ghost-inverse" className="ring-0">Sign in</Button>
                <Button as={Link} to="/register" size="sm" variant="inverse" className="hidden sm:inline-flex">Create account</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
      <section className="keep-colors relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_70%_-10%,rgba(14,165,233,0.35),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-2 lg:pb-32 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-surface/5 px-3 py-1 text-xs font-medium text-brand-100">
              <LuSparkles className="size-3.5 text-accent-400" aria-hidden /> AI trip planning for groups
            </p>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Plan the trip once. Plan it together.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              A day-by-day itinerary that checks the forecast, a packing list that explains itself, and a shared budget
              that works out who owes whom.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {demoButton()}
              {!user && <Button as={Link} to="/register" size="lg" variant="ghost-inverse">Create an account</Button>}
            </div>
            {demoError && <p role="alert" className="mt-4 text-sm text-rose-300">{demoError}</p>}
            <p className="mt-4 text-sm text-slate-400">No sign-up needed. You will join a sample group trip to Cape Town.</p>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="py-24" aria-labelledby="features-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-700">What it does</p>
            <h2 id="features-heading" className="mt-2 text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">
              Everything a group trip needs, in one place
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-surface p-6 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/5">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-24" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="how-heading" className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">How it works</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map(({ title, body }, index) => (
              <li key={title} className="relative">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-slate-50">{index + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-24" aria-labelledby="faq-heading">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_2fr]">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Questions</h2>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  {q}
                  <LuArrowRight className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-90" aria-hidden />
                </summary>
                <p className="mt-3 max-w-2xl text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        <div className="keep-colors relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-950 px-6 py-16 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_50%_120%,rgba(14,165,233,0.35),transparent)]" />
          <div className="relative">
            <LuCalendarDays className="mx-auto size-8 text-accent-400" aria-hidden />
            <h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">See a planned group trip in one click</h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-300">Explore the itinerary, votes and shared expenses from the sample Cape Town trip.</p>
            <div className="mt-8 flex justify-center">{demoButton()}</div>
          </div>
        </div>
      </section>

      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="flex items-center gap-2">
            <LuMessagesSquare className="size-4" aria-hidden /> A portfolio project by Teekay Vuyisile Manale
          </p>
          <a href="https://github.com/TeekayVuyisile/AI-Travel-Planner" className="inline-flex items-center gap-2 rounded-lg hover:text-slate-900" aria-label="Source code on GitHub">
            <LuGithub className="size-4" aria-hidden /> Source
          </a>
        </div>
      </footer>
    </div>
  )
}

export default Landing
