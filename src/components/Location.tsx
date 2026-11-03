import { ArrowUpRight, MapPin, Clock } from 'lucide-react';
import { useScrollReveal, useParallax } from '@/hooks/useScrollReveal';

const locationImage = 'https://images.pexels.com/photos/17640381/pexels-photo-17640381.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

export default function Location() {
  const reveal = useScrollReveal();
  const { ref: imgRef, offset } = useParallax(0.03);

  return (
    <section className="location section-grid" id="local">
      <div className="location-info reveal" ref={reveal}>
        <p className="section-index">14 / onde estamos</p>
        <h2>um espaço<br /><em>para respirar.</em></h2>
        <div className="location-details">
          <div className="location-row">
            <MapPin size={16} strokeWidth={1.2} />
            <div><p className="location-label">endereço</p><p className="location-value">Rua das Camélias, 142<br />Pinheiros · São Paulo</p></div>
          </div>
          <div className="location-row">
            <Clock size={16} strokeWidth={1.2} />
            <div><p className="location-label">horários</p><p className="location-value">ter a sex · 9h às 19h<br />sáb · 9h às 14h</p></div>
          </div>
        </div>
        <a className="text-link" href="https://maps.google.com/?q=Pinheiros+São+Paulo" target="_blank" rel="noopener noreferrer">tracar rota <ArrowUpRight size={15} strokeWidth={1.3} /></a>
      </div>
      <div className="location-visual reveal reveal-delay" ref={reveal}>
        <div className="location-map image-wrap">
          <img ref={imgRef as React.RefObject<HTMLImageElement>} src={locationImage} alt="Interior do espaço de atendimento" style={{ transform: `translateY(${offset}px)` }} />
          <span className="image-caption">ateliê nativa · pinheiros</span>
        </div>
      </div>
    </section>
  );
}
