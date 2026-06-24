import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import AdminGate from './components/AdminGate.jsx'
import HomePage from './pages/HomePage.jsx'
import MapPage from './pages/MapPage.jsx'
import FrequePage from './pages/FrequePage.jsx'
import ArtistePage from './pages/ArtistePage.jsx'
import ArtistesPage from './pages/ArtistesPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="carte" element={<MapPage />} />
          <Route path="fresque/:slug" element={<FrequePage />} />
          <Route path="artistes" element={<ArtistesPage />} />
          <Route path="artiste/:id" element={<ArtistePage />} />
          <Route path="admin" element={<AdminGate><AdminPage /></AdminGate>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
