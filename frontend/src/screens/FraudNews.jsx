import React, { useEffect, useState } from "react";
import { AlertCircle, Clock, ExternalLink, Newspaper } from "lucide-react";

export default function FraudNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const YOUR_API_KEY =  "5c84b1019b2075ccf6f12b8df353dd0f";

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(
          `https://gnews.io/api/v4/search?q=%22digital%20fraud%22&lang=en&country=us&max=10&apikey=${YOUR_API_KEY}`

        );
        const data = await response.json();

        if (data.articles) {
          setNews(data.articles);
        } else {
          setError("No articles found.");
        }
      } catch (err) {
        setError("Error fetching fraud news.");
        console.error("Error fetching fraud news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-5 w-5 animate-spin text-blue-500" />
            <p className="text-gray-600">Loading latest news...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 bg-white rounded-lg shadow-md border border-red-200">
        <div className="p-6">
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center space-x-2">
          <Newspaper className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">Digital Fraud News</h1>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {news.map((article, index) => (
            <div
              key={index}
              className="group relative rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:border-blue-500 hover:shadow-md bg-white"
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                  {article.title}
                </h3>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 flex-shrink-0 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
              
              <p className="mb-2 text-sm text-gray-600 line-clamp-2">
                {article.description}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {article.source?.name && (
                  <>
                    <span className="font-medium">{article.source.name}</span>
                    <span>•</span>
                  </>
                )}
                <span>{formatDate(article.publishedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}