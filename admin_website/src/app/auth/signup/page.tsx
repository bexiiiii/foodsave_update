import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Зарегистрироваться | FoodSave Admin",
  description: "Создайте новую учетную запись для панели управления FoodSave Admin",
};

export default function SignUp() {
  return <SignUpForm />;
}
