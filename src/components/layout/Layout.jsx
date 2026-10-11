import Navbar from './Navbar';
import Footer from './Footer';
import ChatbotWidget from '../chatbot/ChatbotWidget';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
}
