import React, { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { Glass } from "@/ui/Glass";
import { Cloud, Newspaper, Loader2, Terminal } from "lucide-react";

export const DashboardView = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: weather, isLoading: loadingWeather } = useQuery({
    queryKey: ['weather'],
    queryFn: async () => {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true"
      );
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();
      const temp = data.current_weather.temperature;
      const code = data.current_weather.weathercode;

      let condition = "Inconnu";
      if (code === 0) condition = "Dégagé";
      else if (code >= 1 && code <= 3) condition = "Nuageux";
      else if (code >= 45 && code <= 48) condition = "Brouillard";
      else if (code >= 51 && code <= 67) condition = "Pluie";
      else if (code >= 71 && code <= 77) condition = "Neige";
      else if (code >= 80 && code <= 82) condition = "Averses";
      else if (code >= 95 && code <= 99) condition = "Orage";

      return {
        temp: Math.round(temp).toString(),
        condition,
        city: "Paris",
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  const { data: news, isLoading: loadingNews } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const res = await fetch(
        "https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss?hl=fr%26gl=FR%26ceid=FR:fr"
      );
      if (!res.ok) throw new Error('News fetch failed');
      const data = await res.json();
      if (data.items) {
        return data.items
          .slice(0, 4)
          .map((item: any) => ({ title: item.title, link: item.link }));
      }
      return [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-theme-bg/90">
      <h2 className="font-mono text-2xl theme-gradient uppercase tracking-widest mb-8 border-b border-theme-primary/30 pb-4">
        Dashboard Système
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Widget Météo */}
        <Glass level="l2" className="p-6">
          <div className="flex items-center space-x-2 text-theme-primary-light border-b border-theme-primary/30 pb-3 mb-4">
            <Cloud className="w-5 h-5" />
            <h3 className="font-mono text-sm uppercase tracking-widest">
              Météo en direct
            </h3>
          </div>
          <div className="text-5xl font-mono text-theme-primary-light my-4">
            {loadingWeather ? "--" : weather?.temp}°C
          </div>
          <div className="font-mono text-sm text-theme-primary/70 uppercase">
            {loadingWeather ? "Chargement..." : `${weather?.condition} - ${weather?.city}`}
          </div>
        </Glass>

        {/* Widget News */}
        <Glass level="l2" className="p-6 lg:col-span-2">
          <div className="flex items-center space-x-2 text-theme-primary-light border-b border-theme-primary/30 pb-3 mb-4">
            <Newspaper className="w-5 h-5" />
            <h3 className="font-mono text-sm uppercase tracking-widest">
              Actualités Google
            </h3>
          </div>
          <div className="space-y-4">
            {loadingNews ? (
              <div className="flex items-center space-x-2 text-theme-primary/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono text-sm">
                  Chargement des actualités...
                </span>
              </div>
            ) : news && news.length > 0 ? (
              news.map((item: any, idx: number) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-theme-bg/50 border border-theme-primary/20 p-4 rounded-sm hover:border-theme-primary-light/50 transition-colors cursor-pointer"
                >
                  <p className="font-mono text-sm text-theme-primary-light leading-relaxed">
                    {item.title}
                  </p>
                </a>
              ))
            ) : (
              <p className="font-mono text-sm text-theme-primary/50">
                Impossible de charger les actualités.
              </p>
            )}
          </div>
        </Glass>

        {/* Widget Système */}
        <Glass level="l2" className="p-6">
          <div className="flex items-center justify-between border-b border-theme-primary/30 pb-3 mb-4">
            <div className="flex items-center space-x-2 text-theme-primary-light">
              <Terminal className="w-5 h-5" />
              <h3 className="font-mono text-sm uppercase tracking-widest">
                Système
              </h3>
            </div>
          </div>
          <div className="text-2xl font-mono text-theme-primary-light mb-4">
            {time.toLocaleTimeString()}
          </div>
          <div className="font-mono text-sm text-theme-primary/70 space-y-2">
            <div className="flex justify-between">
              <span>CPU:</span>
              <span className="text-theme-primary-light">24%</span>
            </div>
            <div className="flex justify-between">
              <span>MEM:</span>
              <span className="text-theme-primary-light">1.2GB</span>
            </div>
            <div className="flex justify-between">
              <span>NET:</span>
              <span className="text-theme-primary-light">SECURE</span>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
};

export default DashboardView;
