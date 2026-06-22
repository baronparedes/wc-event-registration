import {BrowserRouter} from "react-router-dom";
import {Toaster} from "sonner";
import {AppProviders} from "./app/providers/AppProviders";
import {AppRouter} from "./app/router";

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
