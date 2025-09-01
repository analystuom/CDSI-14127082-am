import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Guest = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState(1);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="sticky h-16 inset-x-0 top-0 z-30 w-full border-b border-gray-200 bg-white backdrop-blur-sm transition-all">
        <div className="mx-auto w-full max-w-screen-xl px-10">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center justify-center gap-14">
              <Link to="/" className="flex items-center z-40 gap-4">
                <img src="/logo-pulsar2.png" alt="Pulsar" className="w-12 h-15" />
                <span className="font-bold text-2xl text-black">Pulsar Analytics</span>
              </Link>
            </div>

            <div className="flex items-center space-x-1.5">
              {isAuthenticated() ? (
                <div className="flex items-center gap-4">
                  <span className="text-gray-700 font-bold">Welcome, {user?.username}!</span>
                  <Link 
                    to="/gettingstart" 
                    className="flex items-center justify-center group px-4 py-2 bg-white text-black border border-black rounded-md hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span className="font-bold">Dashboard</span>
                    <svg className="ml-1.5 transform h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link 
                    to="/login" 
                    className="flex items-center justify-center group px-4 py-2 text-black bg-white border border-black rounded-md hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span>Sign in</span>
                  </Link>
                  <Link 
                    to="/register" 
                    className="flex items-center justify-center group px-4 py-2 bg-white text-black border border-black rounded-md hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span>Register</span>
                    <svg className="ml-1.5 transform h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-slate-50">
        <div className="mx-auto w-full max-w-screen-xl px-10 pt-10 lg:grid lg:grid-cols-2 lg:gap-x-0 lg:pt-24 lg:pb-20">
          <div className="col-span-1 px-2 lg:px-0">
            <div className="relative mx-auto text-center lg:text-left flex flex-col items-center lg:items-start">
              <h1 className="relative w-fit tracking-tighter text-balance font-bold leading-tight text-black text-5xl md:text-6xl">
                Visualize Customer Sentiment Like Never Before
              </h1>

              <p className="mt-8 text-balance text-lg max-w-prose text-center font-semibold lg:pr-10 md:text-wrap lg:text-left text-gray-700">
                Transform overwhelming customer reviews into clear, actionable insights. Pulsar Analytics helps you understand what customers really think about products across major shopping platforms.
              </p>

              <ul className="hidden mt-8 text-left font-medium md:flex flex-col items-center sm:items-start">
                <div className="space-y-2">
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Visualize sentiment analysis
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Interactive visual dashboards
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Instant insights
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Easy sharing
                  </li>
                </div>
              </ul>

              {/* CTA button */}
              <Link 
                to="/register" 
                className="flex items-center justify-center mt-8 group px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-lg font-semibold"
              >
                <span>Start Analyzing</span>
                <svg className="ml-1.5 transform h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <div className="mt-12 flex flex-col sm:flex-row sm:items-start items-center gap-5">
                <div className="flex -space-x-3">
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-slate-200 bg-gradient-to-br from-blue-400 to-blue-600"></div>
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-slate-200 bg-gradient-to-br from-green-400 to-green-600"></div>
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-slate-200 bg-gradient-to-br from-purple-400 to-purple-600"></div>
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-slate-200 bg-gradient-to-br from-red-400 to-red-600"></div>
                  <div className="inline-block h-10 w-10 rounded-full ring-2 ring-slate-200 bg-gradient-to-br from-yellow-400 to-yellow-600"></div>
                </div>

                <div className="flex flex-col justify-between items-center sm:items-start">
                  <div className="flex gap-1">
                    {Array(5).fill().map((_, i) => (
                      <svg key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700"><span className="font-semibold">2500+</span> customers trust us</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-full mt-14 md:mt-0 lg:col-span-1">
            <div className="w-full h-60 lg:h-full rounded-3xl overflow-hidden shadow-lg border border-white-200">
              <img 
                src="/landing1.png" 
                alt="Pulsar Analytics Dashboard - Visualize customer sentiment analysis" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Section */}
      <section className="bg-gray-200/80">
        <div className="mx-auto w-full max-w-screen-xl px-10 pb-10 pt-20">
          <div className="max-w-3xl mx-auto tracking-tight flex flex-col items-center justify-center gap-5">
            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-8 h-8 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <h2 className="font-bold text-xl md:text-3xl text-center">
                Stop struggling with scattered customer feedback
              </h2>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <svg className="w-8 h-8 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="font-bold text-xl md:text-3xl text-center text-balance">
                Get instant, actionable insights with Pulsar Analytics
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-10 lg:flex-row lg:max-w-4xl lg:mx-auto items-center justify-center lg:gap-14 my-16">
            <div className="flex w-full sm:flex-1 flex-col items-center bg-gray-200 rounded-2xl shadow-md py-12">
              <ul className="text-left font-medium flex flex-col items-center sm:items-start">
                <div className="space-y-2 tracking-wide text-xl">
                  <h3 className="font-bold">Before</h3>

                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Hours reading through reviews manually
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Missing key customer complaints
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    No clear sentiment patterns
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Difficult to share insights with team
                  </li>
                </div>
              </ul>
            </div>

            <div className="flex w-full sm:flex-1 flex-col items-center bg-blue-50 rounded-2xl shadow-md py-12">
              <ul className="text-left font-medium flex flex-col items-center sm:items-start">
                <div className="space-y-2 tracking-wide text-xl">
                  <h3 className="font-bold">After</h3>

                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Instant sentiment analysis in seconds
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Automatic categorization of feedback
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Clear visual sentiment trends
                  </li>
                  <li className="flex gap-1.5 items-center text-left">
                    <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Easy export and sharing features
                  </li>
                </div>
              </ul>
            </div>
          </div>

          {/* User testimonial */}
          <div className="max-w-lg mx-auto my-20 flex flex-col items-center sm:items-start">
            <div className="mx-auto flex items-center justify-center gap-1 mb-4">
              {Array(5).fill().map((_, i) => (
                <svg key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>

            <div className="text-center font-semibold text-balance text-gray-800">
              I can't imagine running my e-commerce business without <span className="bg-yellow-200">Pulsar Analytics</span>. It transformed how we understand our customers and helped us improve our products based on real feedback insights.
            </div>

            <div className="flex mx-auto items-center justify-center gap-4 my-6">
              <div className="inline-block pointer-events-none h-12 w-12 rounded-full ring-2 ring-gray-300 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                SM
              </div>
              <div className="flex flex-col">
                <p className="font-semibold">Sarah Mitchell</p>
                <p className="text-sm">E-commerce Manager</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 py-24 pb-16">
        <div className="max-w-sm sm:max-w-2xl lg:max-w-3xl mx-auto flex flex-col gap-4">
          <h2 className="tracking-tight font-bold text-center md:text-left text-3xl lg:text-5xl lg:leading-[3.5rem] text-black">
            Everything you need to understand customer sentiment
          </h2>
          <p className="font-semibold my-4 text-center md:text-left text-gray-700">
            Pulsar Analytics provides powerful tools to analyze, visualize, and act on customer feedback from reviews across all major shopping platforms.
          </p>

          <div className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-between gap-8 md:gap-0 mt-4">
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="h-5 w-5 md:h-10 md:w-10 group-hover:text-black transition-colors duration-200">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold group-hover:text-black transition-colors duration-200">Real-time Analytics</p>
            </div>
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="h-5 w-5 md:h-10 md:w-10 group-hover:text-black transition-colors duration-200">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 4v10a2 2 0 002 2h6a2 2 0 002-2V8M7 8h10M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" />
                </svg>
              </div>
              <p className="text-sm font-semibold group-hover:text-black transition-colors duration-200">Smart Categorization</p>
            </div>
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="h-5 w-5 md:h-10 md:w-10 group-hover:text-black transition-colors duration-200">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-sm font-semibold group-hover:text-black transition-colors duration-200">Instant Insights</p>
            </div>
            <div className="flex flex-col items-center gap-2 group cursor-pointer">
              <div className="h-5 w-5 md:h-10 md:w-10 group-hover:text-black transition-colors duration-200">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </div>
              <p className="text-sm font-semibold group-hover:text-black transition-colors duration-200">Easy Sharing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="bg-gray-200/80 py-20">
        <div className="w-[90%] sm:max-w-2xl lg:max-w-3xl mx-auto flex flex-col items-center text-gray-700">
          <h1 className="font-bold text-3xl text-center">Hey there, I'm <span className="text-blue-600">Mike Pham</span> 👋🏼</h1>
          <div className="inline-block pointer-events-none h-24 w-24 rounded-full my-10 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
            MP
          </div>
          <p className="max-w-prose w-fit text-center font-semibold leading-relaxed">
            <span className="font-bold">As a data analyst and techology consultant</span>, I've seen too many businesses struggle to make sense of customer feedback. That's why I built Pulsar Analytics - to turn overwhelming review data into clear, actionable insights that drive real business decisions.
          </p>

          {/* Demo video placeholder */}
          <div className="my-20 scroll-mt-28 w-full" id="demo">
            <div className="w-full max-w-7xl mx-auto bg-gray-200 rounded-xl shadow-lg border border-blue-200 overflow-hidden">
              {/* Demo Header */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4">
                <h1 className="text-xl font-bold text-blue-800 text-center mb-4">
                  Interactive Demo - See Pulsar Analytics in Action
                </h1>
                <div className="flex flex-wrap justify-center gap-6">
                  <div 
                    className={`text-center cursor-pointer transition-all duration-200 ${activeTab === 1 ? 'transform scale-110' : 'hover:scale-105'}`}
                    onClick={() => setActiveTab(1)}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors duration-200 ${
                      activeTab === 1 ? 'bg-blue-600 shadow-lg' : 'bg-blue-500 hover:bg-blue-600'
                    }`}>
                      <span className="text-white font-bold">1</span>
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-200 ${
                      activeTab === 1 ? 'text-blue-800' : 'text-blue-700'
                    }`}>Word Cloud</span>
                  </div>
                  <div 
                    className={`text-center cursor-pointer transition-all duration-200 ${activeTab === 2 ? 'transform scale-110' : 'hover:scale-105'}`}
                    onClick={() => setActiveTab(2)}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors duration-200 ${
                      activeTab === 2 ? 'bg-green-600 shadow-lg' : 'bg-green-500 hover:bg-green-600'
                    }`}>
                      <span className="text-white font-bold">2</span>
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-200 ${
                      activeTab === 2 ? 'text-green-800' : 'text-green-700'
                    }`}>Sentiment Timeline</span>
                  </div>
                  <div 
                    className={`text-center cursor-pointer transition-all duration-200 ${activeTab === 3 ? 'transform scale-110' : 'hover:scale-105'}`}
                    onClick={() => setActiveTab(3)}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors duration-200 ${
                      activeTab === 3 ? 'bg-purple-600 shadow-lg' : 'bg-purple-500 hover:bg-purple-600'
                    }`}>
                      <span className="text-white font-bold">3</span>
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-200 ${
                      activeTab === 3 ? 'text-purple-800' : 'text-purple-700'
                    }`}>Emotion Analysis</span>
                  </div>
                </div>
              </div>

              {/* Demo Content */}
              <div className="p-8">
                {/* Tab Content */}
                <div className="min-h-[600px]">
                  {/* Word Cloud Tab */}
                  {activeTab === 1 && (
                    <div className="transition-all duration-500 ease-in-out">
                      <h3 className="text-2xl font-bold text-black mb-6 text-center">
                        Qualitative Words Visualization
                      </h3>
                      <div className="bg-gray-200 rounded-xl p-8 min-h-96 flex flex-wrap items-center justify-center gap-4 relative overflow-hidden">
                        {/* Enhanced Word Cloud based on provided image */}
                        <span className="text-6xl font-bold text-blue-600 transform rotate-12 hover:scale-110 transition-transform cursor-pointer" style={{zIndex: 10}}>great</span>
                        <span className="text-5xl font-bold text-orange-500 transform -rotate-6 hover:scale-110 transition-transform cursor-pointer" style={{zIndex: 9}}>good</span>
                        <span className="text-3xl font-semibold text-green-600 transform rotate-8 hover:scale-110 transition-transform cursor-pointer">excellent</span>
                        <span className="text-2xl font-medium text-blue-500 transform -rotate-12 hover:scale-110 transition-transform cursor-pointer">quality</span>
                        <span className="text-4xl font-bold text-green-500 transform rotate-15 hover:scale-110 transition-transform cursor-pointer">nice</span>
                        <span className="text-2xl font-semibold text-purple-600 transform -rotate-8 hover:scale-110 transition-transform cursor-pointer">perfect</span>
                        <span className="text-xl font-medium text-teal-600 transform rotate-6 hover:scale-110 transition-transform cursor-pointer">awesome</span>
                        <span className="text-lg font-medium text-red-500 transform -rotate-15 hover:scale-110 transition-transform cursor-pointer">bad</span>
                        <span className="text-2xl font-semibold text-yellow-600 transform rotate-10 hover:scale-110 transition-transform cursor-pointer">happy</span>
                        <span className="text-xl font-medium text-green-700 transform -rotate-5 hover:scale-110 transition-transform cursor-pointer">better</span>
                        <span className="text-lg font-medium text-orange-600 transform rotate-18 hover:scale-110 transition-transform cursor-pointer">high</span>
                        <span className="text-xl font-medium text-blue-700 transform -rotate-10 hover:scale-110 transition-transform cursor-pointer">durable</span>
                        <span className="text-lg font-medium text-red-400 transform rotate-5 hover:scale-110 transition-transform cursor-pointer">disappointed</span>
                        <span className="text-2xl font-semibold text-green-800 transform -rotate-3 hover:scale-110 transition-transform cursor-pointer">sure</span>
                        <span className="text-lg font-medium text-purple-500 transform rotate-12 hover:scale-110 transition-transform cursor-pointer">outdoor</span>
                        <span className="text-xl font-medium text-teal-500 transform -rotate-7 hover:scale-110 transition-transform cursor-pointer">overall</span>
                        <span className="text-lg font-medium text-black transform rotate-8 hover:scale-110 transition-transform cursor-pointer">different</span>
                        <span className="text-lg font-medium text-blue-400 transform -rotate-4 hover:scale-110 transition-transform cursor-pointer">first</span>
                        <span className="text-lg font-medium text-orange-400 transform rotate-14 hover:scale-110 transition-transform cursor-pointer">wrong</span>
                        <span className="text-xl font-medium text-green-600 transform -rotate-9 hover:scale-110 transition-transform cursor-pointer">easy</span>
                        <span className="text-lg font-medium text-red-600 transform rotate-7 hover:scale-110 transition-transform cursor-pointer">flat</span>
                        <span className="text-lg font-medium text-purple-400 transform -rotate-11 hover:scale-110 transition-transform cursor-pointer">old</span>
                        <span className="text-xl font-medium text-blue-800 transform rotate-9 hover:scale-110 transition-transform cursor-pointer">new</span>
                        <span className="text-lg font-medium text-gray-500 transform -rotate-6 hover:scale-110 transition-transform cursor-pointer">able</span>
                        <span className="text-lg font-medium text-green-500 transform rotate-11 hover:scale-110 transition-transform cursor-pointer">ready</span>
                        <span className="text-xl font-medium text-orange-700 transform -rotate-8 hover:scale-110 transition-transform cursor-pointer">full</span>
                        <span className="text-lg font-medium text-teal-600 transform rotate-13 hover:scale-110 transition-transform cursor-pointer">super</span>
                        <span className="text-lg font-medium text-red-500 transform -rotate-12 hover:scale-110 transition-transform cursor-pointer">low</span>
                      </div>
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">1,247</div>
                          <div className="text-sm text-black">Reviews Analyzed</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">89</div>
                          <div className="text-sm text-black">Unique Qualitative Words</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">73%</div>
                          <div className="text-sm text-black">Positive Keywords</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sentiment Timeline Tab */}
                  {activeTab === 2 && (
                    <div className="transition-all duration-500 ease-in-out">
                      <h3 className="text-2xl font-bold text-black mb-6 text-center">
                        Sentiment Timeline Analysis
                      </h3>
                      <div className="bg-gray-200 rounded-xl p-6">
                        <div className="relative h-96">
                          <svg viewBox="0 0 800 300" className="w-full h-full">
                            {/* Grid */}
                            <defs>
                              <pattern id="timeline-grid" width="50" height="30" patternUnits="userSpaceOnUse">
                                <path d="M 50 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#timeline-grid)" />
                            
                            {/* Y-axis labels */}
                            <text x="30" y="50" fontSize="12" textAnchor="middle" fill="#6b7280">100%</text>
                            <text x="30" y="110" fontSize="12" textAnchor="middle" fill="#6b7280">80%</text>
                            <text x="30" y="170" fontSize="12" textAnchor="middle" fill="#6b7280">60%</text>
                            <text x="30" y="230" fontSize="12" textAnchor="middle" fill="#6b7280">40%</text>
                            <text x="30" y="290" fontSize="12" textAnchor="middle" fill="#6b7280">20%</text>
                            
                            {/* Enhanced Positive trend line - matching the provided chart */}
                            <polyline fill="none" stroke="#10b981" strokeWidth="3"
                              points="50,80 100,95 150,85 200,90 250,85 300,90 350,85 400,100 450,95 500,90 550,95 600,85 650,75 700,65 750,40"/>
                            
                            {/* Enhanced Negative trend line */}
                            <polyline fill="none" stroke="#ef4444" strokeWidth="3"
                              points="50,220 100,200 150,210 200,205 250,210 300,200 350,215 400,190 450,205 500,210 550,200 600,210 650,220 700,230 750,250"/>
                            
                            {/* Data points for positive */}
                            <circle cx="50" cy="80" r="4" fill="#10b981"/>
                            <circle cx="150" cy="85" r="4" fill="#10b981"/>
                            <circle cx="250" cy="85" r="4" fill="#10b981"/>
                            <circle cx="350" cy="85" r="4" fill="#10b981"/>
                            <circle cx="450" cy="95" r="4" fill="#10b981"/>
                            <circle cx="550" cy="95" r="4" fill="#10b981"/>
                            <circle cx="650" cy="75" r="4" fill="#10b981"/>
                            <circle cx="750" cy="40" r="4" fill="#10b981"/>
                            
                            {/* Data points for negative */}
                            <circle cx="50" cy="220" r="4" fill="#ef4444"/>
                            <circle cx="150" cy="210" r="4" fill="#ef4444"/>
                            <circle cx="250" cy="210" r="4" fill="#ef4444"/>
                            <circle cx="350" cy="215" r="4" fill="#ef4444"/>
                            <circle cx="450" cy="205" r="4" fill="#ef4444"/>
                            <circle cx="550" cy="200" r="4" fill="#ef4444"/>
                            <circle cx="650" cy="220" r="4" fill="#ef4444"/>
                            <circle cx="750" cy="250" r="4" fill="#ef4444"/>
                            
                            {/* Month labels - matching the timeline from the image */}
                            <text x="50" y="320" fontSize="10" textAnchor="middle" fill="#6b7280">2015-01</text>
                            <text x="150" y="320" fontSize="10" textAnchor="middle" fill="#6b7280">2015-06</text>
                            <text x="250" y="320" fontSize="10" textAnchor="middle" fill="#6b7280">2016-01</text>
                            <text x="350" y="320" fontSize="10" textAnchor="middle" fill="#6b7280">2016-06</text>
                            <text x="450" y="320" fontSize="10" textAnchor="middle" fill="#6b7280">2017-01</text>
                            <text x="550" y="320" fontSize="10" textAnchor="middle" fill="#6b7280">2017-06</text>
                            <text x="650" y="320" fontSize="10" textAnchor="middle" fill="#6b7280">2018-01</text>
                            <text x="750" y="320" fontSize="10" textAnchor="middle" fill="#6b7280">2018-06</text>
                          </svg>
                        </div>
                        <div className="flex justify-center mt-4 space-x-8">
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium text-gray-700">Positive Sentiment</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium text-gray-700">Negative Sentiment</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">82%</div>
                          <div className="text-sm text-black">Peak Positive (Latest)</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">↑15%</div>
                          <div className="text-sm text-black">Trend Improvement</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">18%</div>
                          <div className="text-sm text-black">Current Negative</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Emotion Analysis Tab */}
                  {activeTab === 3 && (
                    <div className="transition-all duration-500 ease-in-out">
                      <h3 className="text-2xl font-bold text-black mb-6 text-center">
                        Emotion Analysis
                      </h3>
                      <div className="bg-gray-200 rounded-xl p-6">
                        <div className="relative h-96 flex items-center justify-center">
                          <svg viewBox="0 0 400 400" className="w-80 h-80">
                            {/* Background radar grid - matching the provided image structure */}
                            <defs>
                              {/* Concentric circles for scale */}
                              <circle cx="200" cy="200" r="32" fill="none" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                              <circle cx="200" cy="200" r="64" fill="none" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                              <circle cx="200" cy="200" r="96" fill="none" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                              <circle cx="200" cy="200" r="128" fill="none" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                              <circle cx="200" cy="200" r="160" fill="none" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                            </defs>
                            
                            {/* Radar spokes - 8 directions */}
                            <line x1="200" y1="40" x2="200" y2="360" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                            <line x1="313" y1="87" x2="87" y2="313" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                            <line x1="360" y1="200" x2="40" y2="200" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                            <line x1="313" y1="313" x2="87" y2="87" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
                            
                            {/* Single product emotion data - based on OpinionAndTone structure */}
                            <polygon
                              points="200,104 290,132 328,200 270,268 200,296 130,268 72,200 110,132"
                              fill="rgba(54, 162, 235, 0.2)"
                              stroke="rgb(54, 162, 235)"
                              strokeWidth="2"
                            />
                            
                            {/* Data points */}
                            <circle cx="200" cy="104" r="3" fill="rgb(54, 162, 235)" stroke="#fff" strokeWidth="2"/>
                            <circle cx="290" cy="132" r="3" fill="rgb(54, 162, 235)" stroke="#fff" strokeWidth="2"/>
                            <circle cx="328" cy="200" r="3" fill="rgb(54, 162, 235)" stroke="#fff" strokeWidth="2"/>
                            <circle cx="270" cy="268" r="3" fill="rgb(54, 162, 235)" stroke="#fff" strokeWidth="2"/>
                            <circle cx="200" cy="296" r="3" fill="rgb(54, 162, 235)" stroke="#fff" strokeWidth="2"/>
                            <circle cx="130" cy="268" r="3" fill="rgb(54, 162, 235)" stroke="#fff" strokeWidth="2"/>
                            <circle cx="72" cy="200" r="3" fill="rgb(54, 162, 235)" stroke="#fff" strokeWidth="2"/>
                            <circle cx="110" cy="132" r="3" fill="rgb(54, 162, 235)" stroke="#fff" strokeWidth="2"/>
                            
                            {/* Labels - matching the structure from both images */}
                            <text x="200" y="25" fontSize="12" textAnchor="middle" fill="#374151" fontWeight="bold">Joy</text>
                            <text x="200" y="35" fontSize="10" textAnchor="middle" fill="#6b7280">1.0</text>
                            
                            <text x="325" y="125" fontSize="12" textAnchor="start" fill="#374151" fontWeight="bold">Trust</text>
                            <text x="340" y="200" fontSize="12" textAnchor="start" fill="#374151" fontWeight="bold">Fear</text>
                            <text x="285" y="290" fontSize="12" textAnchor="middle" fill="#374151" fontWeight="bold">Surprise</text>
                            <text x="200" y="385" fontSize="12" textAnchor="middle" fill="#374151" fontWeight="bold">Sadness</text>
                            <text x="115" y="290" fontSize="12" textAnchor="middle" fill="#374151" fontWeight="bold">Disgust</text>
                            <text x="60" y="200" fontSize="12" textAnchor="end" fill="#374151" fontWeight="bold">Anger</text>
                            <text x="75" y="125" fontSize="12" textAnchor="end" fill="#374151" fontWeight="bold">Anticipation</text>
                            
                            {/* Scale markers */}
                            <text x="232" y="200" fontSize="10" fill="#6b7280">0.2</text>
                            <text x="264" y="200" fontSize="10" fill="#6b7280">0.4</text>
                            <text x="296" y="200" fontSize="10" fill="#6b7280">0.6</text>
                            <text x="328" y="200" fontSize="10" fill="#6b7280">0.8</text>
                          </svg>
                        </div>
                        <div className="flex justify-center mt-4">
                          <div className="flex items-center bg-gray-200 px-4 py-2 rounded-lg shadow-sm">
                            <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium text-gray-700">Product Analysis</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">0.6</div>
                          <div className="text-xs text-black">Joy</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-green-600">0.5</div>
                          <div className="text-xs text-black">Trust</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">0.2</div>
                          <div className="text-xs text-black">Fear</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">0.4</div>
                          <div className="text-xs text-black">Surprise</div>
                        </div>
                        <div className="bg-gray-200 p-3 rounded-lg">
                          <div className="text-lg font-bold text-black">0.3</div>
                          <div className="text-xs text-black">Sadness</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-red-600">0.2</div>
                          <div className="text-xs text-black">Disgust</div>
                        </div>
                        <div className="bg-pink-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-pink-600">0.5</div>
                          <div className="text-xs text-black">Anger</div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-indigo-600">0.4</div>
                          <div className="text-xs text-black">Anticipation</div>
                        </div>
                      </div>
                      <div className="mt-6 text-center">
                        <p className="text-sm text-black mb-2">
                          <strong>Emotion Distribution:</strong> Analysis of emotional patterns in customer reviews
                        </p>
                        <p className="text-xs text-gray-500">
                          Each axis represents a different emotional dimension, with values ranging from 0 to 1
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Call to Action */}
                <div className="mt-8 text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8">
                  <h4 className="text-xl font-bold text-black mb-3">Ready to analyze your products?</h4>
                  <p className="text-black mb-6 text-lg">Get these insights and more for your own product reviews</p>
                  <Link 
                    to="/register"
                    className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Start Free Analysis
                    <svg className="ml-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center mb-4">
            <svg className="animate-bounce w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          <Link 
            to="/register"
            className="font-medium text-center text-2xl text-black hover:text-gray-800 cursor-pointer transition-colors duration-200"
          >
            Try it now
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-200/80 py-20" id="faq">
        <div className="max-w-sm sm:max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-12 capitalize">Frequently Asked Questions</h1>

          <div className="space-y-4">
            <div className="bg-slate-100/50 p-4 px-7 rounded-lg hover:shadow">
              <details className="group">
                <summary className="flex items-center justify-between w-full py-2 text-left text-zinc-950 cursor-pointer">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-zinc-950 transition-transform duration-200 group-open:rotate-90 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="text-zinc-950 text-xl font-semibold">
                      How does Pulsar Analytics analyze customer sentiment?
                    </div>
                  </div>
                </summary>
                <div className="mt-4 pl-6 pr-2 leading-relaxed text-zinc-500">
                  Pulsar Analytics uses advanced natural language processing and machine learning algorithms to analyze the emotional tone of customer reviews. Our system can detect positive and negative sentiments, as well as specific emotions like satisfaction, frustration, excitement, and more.
                </div>
              </details>
            </div>

            <div className="bg-slate-100/50 p-4 px-7 rounded-lg hover:shadow">
              <details className="group">
                <summary className="flex items-center justify-between w-full py-2 text-left text-zinc-950 cursor-pointer">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-zinc-950 transition-transform duration-200 group-open:rotate-90 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="text-zinc-950 text-xl font-semibold">
                      Which shopping platforms does Pulsar Analytics support?
                    </div>
                  </div>
                </summary>
                <div className="mt-4 pl-6 pr-2 leading-relaxed text-zinc-500">
                  Currently, Pulsar Analytics supports major e-commerce platforms including Amazon, eBay, Shopify stores, WooCommerce, and many others. We're constantly adding support for new platforms based on user requests and market demand.
                </div>
              </details>
            </div>

            <div className="bg-slate-100/50 p-4 px-7 rounded-lg hover:shadow">
              <details className="group">
                <summary className="flex items-center justify-between w-full py-2 text-left text-zinc-950 cursor-pointer">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-zinc-950 transition-transform duration-200 group-open:rotate-90 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="text-zinc-950 text-xl font-semibold">
                      How quickly does Pulsar Analytics process reviews?
                    </div>
                  </div>
                </summary>
                <div className="mt-4 pl-6 pr-2 leading-relaxed text-zinc-500">
                  Most sentiment analysis results are available within seconds of selecting the product. Large datasets may take a few minutes, but you'll see progress updates throughout the process.
                </div>
              </details>
            </div>

            <div className="bg-slate-100/50 p-4 px-7 rounded-lg hover:shadow">
              <details className="group">
                <summary className="flex items-center justify-between w-full py-2 text-left text-zinc-950 cursor-pointer">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-zinc-950 transition-transform duration-200 group-open:rotate-90 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="text-zinc-950 text-xl font-semibold">
                      Do you offer customer support?
                    </div>
                  </div>
                </summary>
                <div className="mt-4 pl-6 pr-2 leading-relaxed text-zinc-500">
                  Absolutely! We provide email support for all users, priority support for Pro users, and 24/7 phone support for Enterprise customers. Our team is dedicated to helping you get the most out of Pulsar Analytics.
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* As Seen On Section */}
      <section className="bg-gray-200 py-16">
        <div className="mx-auto w-full max-w-screen-xl px-10">
          <h2 className="text-center text-gray-500 font-semibold mb-8">Trusted by businesses worldwide</h2>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
            <div className="flex items-center gap-2 text-2xl font-bold text-black">
              <span>🏪</span> E-commerce
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-black">
              <span>📱</span> Tech Startups
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-black">
              <span>🏢</span> Enterprise
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-black">
              <span>📈</span> Marketing
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-black">
              <span>🛍️</span> Retail
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-black">
              <span>💼</span> Consulting
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gray-200 py-20">
        <div className="mx-auto w-full max-w-screen-xl px-10">
          <div className="text-center space-y-5 my-14">
            <h1 className="font-bold text-4xl">2,500+ happy customers</h1>
            <h2 className="font-semibold text-xl">Hear from our satisfied customers about their experience with Pulsar Analytics.</h2>
          </div>

          <div className="mx-auto md:columns-2 lg:columns-3 space-y-4 md:space-y-6 md:gap-6">
            <div className="break-inside-avoid">
              <figure className="relative h-full w-full max-w-[500px] p-6 rounded-xl border border-orange-200 bg-orange-50">
                <blockquote className="border-b pb-4 font-semibold text-lg">
                  Pulsar Analytics transformed how we understand our customers. The insights we get from customer reviews now directly influence our product roadmap and marketing strategy.
                </blockquote>
                <figcaption>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="inline-block shrink-0 pointer-events-none h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                      AM
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold">Alex Martinez</p>
                      <p className="text-sm">Product Manager, TechCorp</p>
                    </div>
                  </div>
                </figcaption>
              </figure>
            </div>

            <div className="break-inside-avoid">
              <figure className="relative h-full w-full max-w-[500px] p-6 rounded-xl border border-indigo-200 bg-indigo-50">
                <blockquote className="border-b pb-4 font-semibold text-lg">
                  The real-time sentiment analysis helped us identify and fix issues before they became major problems. Our customer satisfaction scores have never been higher.
                </blockquote>
                <figcaption>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="inline-block shrink-0 pointer-events-none h-12 w-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                      JC
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold">Jennifer Chen</p>
                      <p className="text-sm">Customer Success Director</p>
                    </div>
                  </div>
                </figcaption>
              </figure>
            </div>

            <div className="break-inside-avoid">
              <figure className="relative h-full w-full max-w-[500px] p-6 rounded-xl border border-cyan-200 bg-cyan-50">
                <blockquote className="border-b pb-4 font-semibold text-lg">
                  Amazing tool! We can now spot trends in customer feedback that we never would have caught manually. It's like having a data scientist dedicated to customer sentiment.
                </blockquote>
                <figcaption>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="inline-block shrink-0 pointer-events-none h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-semibold">
                      DR
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold">David Rodriguez</p>
                      <p className="text-sm">Marketing Director</p>
                    </div>
                  </div>
                </figcaption>
              </figure>
            </div>

            <div className="break-inside-avoid">
              <figure className="relative h-full w-full max-w-[500px] p-6 rounded-xl border border-green-200 bg-green-50">
                <blockquote className="border-b pb-4 font-semibold text-lg">
                  The visualizations are incredible. I can show my executive team exactly what customers are saying about our products in a format they actually understand and act on.
                </blockquote>
                <figcaption>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="inline-block shrink-0 pointer-events-none h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                      LW
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold">Lisa Wang</p>
                      <p className="text-sm">VP of Operations</p>
                    </div>
                  </div>
                </figcaption>
              </figure>
            </div>

            <div className="break-inside-avoid">
              <figure className="relative h-full w-full max-w-[500px] p-6 rounded-xl border border-pink-200 bg-pink-50">
                <blockquote className="border-b pb-4 font-semibold text-lg">
                  Pulsar Analytics pays for itself. We've improved our products based on the insights and seen a 25% increase in positive reviews. Best investment we've made this year.
                </blockquote>
                <figcaption>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="inline-block shrink-0 pointer-events-none h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-semibold">
                      MT
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold">Michael Thompson</p>
                      <p className="text-sm">Founder, RetailPlus</p>
                    </div>
                  </div>
                </figcaption>
              </figure>
            </div>

            <div className="break-inside-avoid">
              <figure className="relative h-full w-full max-w-[500px] p-6 rounded-xl border border-blue-200 bg-gradient-to-tr from-blue-200 via-indigo-200 to-teal-200 transition-all duration-300 ease-in-out transform hover:rotate-2 hover:scale-105 hover:shadow-lg">
                <blockquote className="border-b pb-4 font-semibold text-lg">
                  This could be your testimonial! Try Pulsar Analytics today and discover insights that will transform your business. Join thousands of satisfied customers.
                </blockquote>
                <figcaption>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="inline-block shrink-0 pointer-events-none h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      YOU
                    </div>
                    <div className="flex flex-col">
                      <p className="font-semibold">Your Business</p>
                      <p className="text-sm">@YourSuccess</p>
                    </div>
                  </div>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="pt-40 pb-32 px-5">
        <div className="flex flex-col md:flex-row max-w-5xl mx-auto px-14 py-10 gap-10 bg-gradient-to-br from-white-200 via-white-300 to-white-400 rounded-3xl border border-black-500">
          <div className="space-y-6">
            <h2 className="relative tracking-tight font-bold text-3xl md:text-4xl text-black">
              <span className="absolute top-[-20px] right-0">
                <svg className="h-10 w-10 text-sky-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </span>
              Ready to transform your customer insights?
            </h2>

            <p className="text-lg font-medium leading-relaxed text-gray-700">
              Join thousands of businesses already using Pulsar Analytics to make data-driven decisions. Start analyzing customer sentiment today and discover what your customers really think about your products.
            </p>

            <div className="w-full lg:w-1/4">
              <Link 
                to="/register" 
                className="flex items-center justify-center group px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-lg font-semibold"
              >
                <span>Get Started Now</span>
                <svg className="ml-1.5 transform h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto w-full max-w-screen-xl px-10 py-14 pb-20 flex flex-col items-center justify-center md:items-start md:justify-between md:flex-row">
          <div className="max-w-[16rem] flex flex-col space-y-4 items-center justify-center md:items-start md:justify-normal">
            <Link to="/" className="flex items-center z-40 gap-4">
              <span className="font-bold text-xl text-black">Pulsar Analytics</span>
            </Link>

            <p className="text-gray-700 md:text-[0.875rem] font-medium text-center md:text-left">
              Transforming customer reviews into actionable business insights.
            </p>

            <small className="mb-2 block text-gray-700 select-none">
              Pulsar Analytics &copy; {new Date().getFullYear()} - All rights reserved
            </small>
          </div>

          <div className="flex flex-col md:flex-row gap-10 md:gap-24 mt-10 md:mt-0">
            <div className="flex flex-col items-center md:items-start px-4">
              <h3 className="font-semibold text-gray-400 mb-2">PRODUCT</h3>
              <ul className="space-y-2 text-black text-sm text-center md:text-left">
                <li className="hover:underline hover:underline-offset-1">
                  <Link to="/register">Get Started</Link>
                </li>
                <li className="hover:underline hover:underline-offset-1">
                  <Link to="/login">Sign In</Link>
                </li>
                <li className="hover:underline hover:underline-offset-1">
                  <a href="#features">Features</a>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center md:items-start px-4">
              <h3 className="font-semibold text-gray-400 mb-2">LEGAL</h3>
              <ul className="space-y-2 text-black text-sm text-center md:text-left">
                <li className="hover:underline hover:underline-offset-1">
                  <a href="#privacy">Privacy Policy</a>
                </li>
                <li className="hover:underline hover:underline-offset-1">
                  <a href="#terms">Terms of Service</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Guest; 