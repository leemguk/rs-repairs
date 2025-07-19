import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Lock } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Back to Home</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="https://ih5f1pkyy3brtmob.public.blob.vercel-storage.com/RepairHelpLogov2.png" 
              alt="Repair Help" 
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <Lock className="mx-auto h-12 w-12 text-orange-600 mb-4" />
              <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
              <p className="text-gray-600">Last updated: 19th July 2025</p>
            </div>

            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                <p className="mb-4">
                  Ransom Spares Ltd ("we", "us", "our") operates the repair.help website (the "Service"). 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                  when you use our Service.
                </p>
                <p className="mb-4">
                  We are committed to protecting your privacy and complying with the UK General Data Protection 
                  Regulation (UK GDPR) and the Data Protection Act 2018.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Data Controller</h2>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="font-semibold">Ransom Spares Ltd</p>
                  <p>Unit 3 Flushing Meadow</p>
                  <p>Yeovil, BA21 5DL</p>
                  <p>Email: privacy@repair.help</p>
                  <p>Phone: 0303 003 6404</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Information We Collect</h2>
                <h3 className="text-xl font-semibold mb-3">3.1 Information You Provide</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Contact Information:</strong> Name, email address, phone number, postal address</li>
                  <li><strong>Appliance Information:</strong> Type, brand, model, age, fault description</li>
                  <li><strong>Payment Information:</strong> Processed securely via Stripe (we do not store card details)</li>
                  <li><strong>Communication Data:</strong> Emails, diagnostic reports, support queries</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">3.2 Information Automatically Collected</h3>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent on site</li>
                  <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
                  <li><strong>Cookies:</strong> Session cookies, preference cookies, analytics cookies</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Information</h2>
                <p className="mb-4">We use your information for the following purposes:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Process and manage repair bookings</li>
                  <li>Communicate with you about your booking</li>
                  <li>Process payments via Stripe</li>
                  <li>Provide AI-powered diagnostic services</li>
                  <li>Send booking confirmations and updates</li>
                  <li>Improve our services and user experience</li>
                  <li>Comply with legal obligations</li>
                  <li>Prevent fraud and ensure security</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Legal Basis for Processing</h2>
                <p className="mb-4">We process your personal data based on:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Contract Performance:</strong> To provide the services you've requested</li>
                  <li><strong>Legitimate Interests:</strong> To improve our services and prevent fraud</li>
                  <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                  <li><strong>Consent:</strong> For marketing communications (where applicable)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
                <h3 className="text-xl font-semibold mb-3">6.1 Service Providers</h3>
                <p className="mb-4">We share your information with carefully selected third parties who assist us in providing our services:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Pacifica Group Ltd:</strong> Our repair service partner who performs the repairs</li>
                  <li><strong>Payment Processors:</strong> Secure payment handling and transaction processing</li>
                  <li><strong>Communication Services:</strong> Email delivery and customer notifications</li>
                  <li><strong>Address Validation:</strong> UK address lookup and verification services</li>
                  <li><strong>Infrastructure Providers:</strong> Secure data storage and hosting services</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">6.2 Legal Requirements</h3>
                <p className="mb-4">
                  We may disclose your information if required by law or in response to valid requests by 
                  public authorities.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
                <p className="mb-4">
                  We implement appropriate technical and organisational measures to protect your personal data:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>SSL/TLS encryption for data transmission</li>
                  <li>Secure database storage with access controls</li>
                  <li>Regular security assessments and updates</li>
                  <li>Employee training on data protection</li>
                  <li>Incident response procedures</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
                <p className="mb-4">We retain your personal data for:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Booking Data:</strong> 3 years for warranty and service history</li>
                  <li><strong>Financial Records:</strong> 7 years for tax and accounting purposes</li>
                  <li><strong>Diagnostic Data:</strong> 1 year for service improvement</li>
                  <li><strong>Marketing Data:</strong> Until you unsubscribe</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">9. Your Rights</h2>
                <p className="mb-4">Under UK GDPR, you have the right to:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                  <li><strong>Erasure:</strong> Request deletion of your data (subject to legal obligations)</li>
                  <li><strong>Restriction:</strong> Limit processing of your data</li>
                  <li><strong>Portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Object:</strong> Object to certain types of processing</li>
                  <li><strong>Withdraw Consent:</strong> Where processing is based on consent</li>
                </ul>
                <p className="mb-4">
                  To exercise these rights, contact us at privacy@repair.help.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">10. Cookies</h2>
                <p className="mb-4">We use cookies to:</p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Remember your preferences</li>
                  <li>Understand how you use our Service</li>
                  <li>Improve user experience</li>
                  <li>Provide security features</li>
                </ul>
                <p className="mb-4">
                  You can control cookies through your browser settings. Disabling cookies may affect 
                  some features of the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">11. International Transfers</h2>
                <p className="mb-4">
                  Some of our service providers operate outside the UK. We ensure appropriate safeguards 
                  are in place, such as:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Standard contractual clauses approved by the ICO</li>
                  <li>Adequacy decisions for certain countries</li>
                  <li>Your explicit consent where required</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">12. Children's Privacy</h2>
                <p className="mb-4">
                  Our Service is not intended for children under 18. We do not knowingly collect personal 
                  data from children. If you believe we have collected data from a child, please contact us.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">13. Marketing Communications</h2>
                <p className="mb-4">
                  We may send you marketing communications about our services if you have opted in. You can 
                  unsubscribe at any time by:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li>Clicking the unsubscribe link in any email</li>
                  <li>Contacting us at privacy@repair.help</li>
                  <li>Updating your preferences in your account</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">14. Third-Party Links</h2>
                <p className="mb-4">
                  Our Service may contain links to third-party websites. We are not responsible for their 
                  privacy practices. Please review their privacy policies before providing personal information.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">15. Changes to This Policy</h2>
                <p className="mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of any material 
                  changes by posting the new policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">16. Complaints</h2>
                <p className="mb-4">
                  If you have concerns about how we handle your personal data, you have the right to lodge 
                  a complaint with the Information Commissioner's Office (ICO):
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold">Information Commissioner's Office</p>
                  <p>Wycliffe House, Water Lane</p>
                  <p>Wilmslow, Cheshire, SK9 5AF</p>
                  <p>Helpline: 0303 123 1113</p>
                  <p>Website: ico.org.uk</p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">17. Contact Us</h2>
                <p className="mb-4">
                  For any questions about this Privacy Policy or our data practices, please contact:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold">Data Protection Officer</p>
                  <p>Ransom Spares Ltd</p>
                  <p>Unit 3 Flushing Meadow</p>
                  <p>Yeovil, BA21 5DL</p>
                  <p>Email: privacy@repair.help</p>
                  <p>Phone: 0303 003 6404</p>
                </div>
              </section>
            </div>

            <div className="mt-8 pt-8 border-t text-center">
              <Link href="/">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}