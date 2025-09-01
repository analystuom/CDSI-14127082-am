import React, { useState } from 'react';
import Card from '../components/ui/Card';

const UserFeedback = () => {
  // Form state for all questions
  const [formData, setFormData] = useState({
    q1_intuitive_rating: 0,
    q2_useful_insight: '',
    q3_ease_of_use: 0,
    q4_feature_improvement: '',
    q5_accuracy_rating: 0
  });
  
  // UI state
  const [hoveredRatings, setHoveredRatings] = useState({
    q1: 0,
    q3: 0,
    q5: 0
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [noticeType, setNoticeType] = useState(''); // 'success' or 'error'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form - check if all required fields are filled
    const isValid = formData.q1_intuitive_rating > 0 &&
                   formData.q2_useful_insight.trim() !== '' &&
                   formData.q3_ease_of_use > 0 &&
                   formData.q4_feature_improvement.trim() !== '' &&
                   formData.q5_accuracy_rating > 0;
    
    if (!isValid) {
      setNoticeType('error');
      setShowNotice(true);
      setTimeout(() => setShowNotice(false), 5000);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call (replace with actual backend call later)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Reset form
      setFormData({
        q1_intuitive_rating: 0,
        q2_useful_insight: '',
        q3_ease_of_use: 0,
        q4_feature_improvement: '',
        q5_accuracy_rating: 0
      });
      setHoveredRatings({ q1: 0, q3: 0, q5: 0 });
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setNoticeType('error');
      setShowNotice(true);
      setTimeout(() => setShowNotice(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle rating click for different questions
  const handleRatingClick = (question, value) => {
    setFormData(prev => ({
      ...prev,
      [question]: value
    }));
  };

  // Handle rating hover
  const handleRatingHover = (question, value) => {
    setHoveredRatings(prev => ({
      ...prev,
      [question]: value
    }));
  };

  // Handle rating leave
  const handleRatingLeave = (question) => {
    setHoveredRatings(prev => ({
      ...prev,
      [question]: 0
    }));
  };

  // Handle text input changes
  const handleTextChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Close success modal
  const closeSuccessModal = () => {
    setShowSuccessModal(false);
  };

  // Get rating scale labels for 1-10 scale
  const getRatingLabel = (value, type) => {
    if (type === 'intuitive') {
      if (value <= 2) return 'Very confusing';
      if (value <= 4) return 'Somewhat confusing';
      if (value <= 6) return 'Neutral';
      if (value <= 8) return 'Quite clear';
      return 'Perfectly clear';
    } else if (type === 'ease') {
      if (value <= 2) return 'Very difficult to use';
      if (value <= 4) return 'Somewhat difficult';
      if (value <= 6) return 'Neutral';
      if (value <= 8) return 'User-friendly';
      return 'Extremely user-friendly';
    } else if (type === 'accuracy') {
      if (value <= 2) return 'Not at all accurate';
      if (value <= 4) return 'Somewhat inaccurate';
      if (value <= 6) return 'Neutral';
      if (value <= 8) return 'Quite accurate';
      return 'Extremely accurate';
    }
    return '';
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center mb-4">
        <h1 className="text-3xl font-bold text-black">User Feedback</h1>
        <div className="relative ml-3">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Information about User Feedback"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 p-6">
              <div className="text-sm text-gray-800 leading-relaxed space-y-3">
                <h3 className="font-semibold text-lg text-gray-900 mb-3">About User Feedback</h3>
                <p className="text-base">
                  Complete our comprehensive questionnaire to help us improve Pulsar Analytics. This form includes:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-base">
                  <li><strong>Rating Questions:</strong> Rate various aspects on a scale of 1-10</li>
                  <li><strong>Open-ended Questions:</strong> Share detailed insights and suggestions</li>
                  <li><strong>User Experience Focus:</strong> Help us understand how you use the platform</li>
                  <li><strong>Comprehensive Feedback:</strong> 5 targeted questions covering all key areas</li>
                </ul>
                <p className="text-base pt-2">
                  All questions are required to provide complete feedback for our analysis.
                </p>
              </div>
              {/* Arrow pointing up */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-gray-300 rotate-45"></div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-lg text-black">
          Complete our comprehensive questionnaire to help us understand your experience with sentiment visualizations
        </p>
      </div>

      {/* Error Notice */}
      {showNotice && noticeType === 'error' && (
        <div className="rounded-lg p-4 mb-6 transition-all duration-300 bg-red-50 border border-red-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                Please complete all 5 questions (both ratings and text responses) before submitting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Questionnaire */}
      <Card title="Sentiment Visualization Feedback Questionnaire" subtitle="Help us improve your experience with detailed feedback">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Question 1: Intuitive Rating */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-black mb-2">Question 1</h3>
              <label className="block text-sm font-medium text-black mb-4">
                On a scale of 1 to 10, how intuitive did you find the sentiment visualizations? *
              </label>
              <p className="text-sm text-gray-600 mb-4">
                (Please select one option where 1 is "Very confusing" and 10 is "Perfectly clear".)
              </p>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleRatingClick('q1_intuitive_rating', num)}
                  onMouseEnter={() => handleRatingHover('q1', num)}
                  onMouseLeave={() => handleRatingLeave('q1')}
                  className={`w-10 h-10 rounded-full border-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    num <= (hoveredRatings.q1 || formData.q1_intuitive_rating)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mb-3">
              <span>Very confusing</span>
              <span>Perfectly clear</span>
            </div>
            
            {formData.q1_intuitive_rating > 0 && (
              <p className="text-sm font-medium text-blue-700">
                Selected: {formData.q1_intuitive_rating}/10 - {getRatingLabel(formData.q1_intuitive_rating, 'intuitive')}
              </p>
            )}
          </div>

          {/* Question 2: Useful Insight */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-black mb-2">Question 2</h3>
              <label htmlFor="q2_insight" className="block text-sm font-medium text-black mb-4">
                What was the most useful insight you gained from using the visualizations, and why was it valuable to you? *
              </label>
            </div>
            
            <textarea
              id="q2_insight"
              value={formData.q2_useful_insight}
              onChange={(e) => handleTextChange('q2_useful_insight', e.target.value)}
              placeholder="Please describe the most valuable insight you gained and explain why it was useful to you..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-black placeholder-gray-500"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-600">
                Share specific insights and their practical value
              </p>
              <p className="text-sm text-gray-500">
                {formData.q2_useful_insight.length}/500 characters
              </p>
            </div>
          </div>

          {/* Question 3: Ease of Use */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-black mb-2">Question 3</h3>
              <label className="block text-sm font-medium text-black mb-4">
                Please rate the overall ease of use of the web application on a scale from 1 to 10. *
              </label>
              <p className="text-sm text-gray-600 mb-4">
                (Please select one option where 1 is "Very difficult to use" and 10 is "Extremely user-friendly".)
              </p>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleRatingClick('q3_ease_of_use', num)}
                  onMouseEnter={() => handleRatingHover('q3', num)}
                  onMouseLeave={() => handleRatingLeave('q3')}
                  className={`w-10 h-10 rounded-full border-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    num <= (hoveredRatings.q3 || formData.q3_ease_of_use)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mb-3">
              <span>Very difficult to use</span>
              <span>Extremely user-friendly</span>
            </div>
            
            {formData.q3_ease_of_use > 0 && (
              <p className="text-sm font-medium text-green-700">
                Selected: {formData.q3_ease_of_use}/10 - {getRatingLabel(formData.q3_ease_of_use, 'ease')}
              </p>
            )}
          </div>

          {/* Question 4: Feature Improvement */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-black mb-2">Question 4</h3>
              <label htmlFor="q4_improvement" className="block text-sm font-medium text-black mb-4">
                If you could add, remove, or change one feature to improve this application, what would it be? *
              </label>
            </div>
            
            <textarea
              id="q4_improvement"
              value={formData.q4_feature_improvement}
              onChange={(e) => handleTextChange('q4_feature_improvement', e.target.value)}
              placeholder="Describe one specific feature you would add, remove, or change to improve the application..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-black placeholder-gray-500"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-600">
                Share constructive suggestions for improvement
              </p>
              <p className="text-sm text-gray-500">
                {formData.q4_feature_improvement.length}/500 characters
              </p>
            </div>
          </div>

          {/* Question 5: Accuracy Rating */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-black mb-2">Question 5</h3>
              <label className="block text-sm font-medium text-black mb-4">
                To what extent do you feel the visualizations accurately represented the underlying sentiment of the data? *
              </label>
              <p className="text-sm text-gray-600 mb-4">
                (Please select one option where 1 is "Not at all accurate" and 10 is "Extremely accurate".)
              </p>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleRatingClick('q5_accuracy_rating', num)}
                  onMouseEnter={() => handleRatingHover('q5', num)}
                  onMouseLeave={() => handleRatingLeave('q5')}
                  className={`w-10 h-10 rounded-full border-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    num <= (hoveredRatings.q5 || formData.q5_accuracy_rating)
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mb-3">
              <span>Not at all accurate</span>
              <span>Extremely accurate</span>
            </div>
            
            {formData.q5_accuracy_rating > 0 && (
              <p className="text-sm font-medium text-purple-700">
                Selected: {formData.q5_accuracy_rating}/10 - {getRatingLabel(formData.q5_accuracy_rating, 'accuracy')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isSubmitting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting Questionnaire...</span>
                </div>
              ) : (
                'Submit Questionnaire'
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeSuccessModal}
          ></div>
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              {/* Success Icon */}
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              
              {/* Modal Content */}
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  Feedback Submitted Successfully!
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Thank you for taking the time to complete our comprehensive questionnaire. 
                    Your feedback is invaluable in helping us improve the Pulsar Analytics platform.
                  </p>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>What happens next?</strong><br/>
                    Our team will review your responses and use your insights to enhance the sentiment visualization experience.
                  </p>
                </div>
              </div>
              
              {/* Modal Actions */}
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
                  onClick={closeSuccessModal}
                >
                  Continue Using Pulsar Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserFeedback;
