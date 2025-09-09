import LoginForm from "../../components/LoginForm";

export default function Page(){
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="text-xl font-semibold">Anmeldung</div>
      <LoginForm />
    </div>
  );
}
