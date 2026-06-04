Read PROJECT_MASTER_PLAN.md first.

Current task: improve customer/owner flow and UI/UX direction.

Do not add Supabase yet unless the current approved phase allows it.
Do not add real authentication yet unless current phase allows it.
Do not add real AI image generation yet.
Do not add payments.
Do not start the next phase.
Do not break existing pages.

This task is to improve the product flow, user journey, and UI design so the platform feels modern, smooth, young, and marketplace-ready.

Current issue:
The UI looks too basic and old-fashioned. It does not feel like a modern booking marketplace for young users. The experience should feel more visual, mobile-friendly, interactive, and smooth.

Target audience:
Mostly users aged 10 to 30.

Design style:
- Modern
- Youthful
- Visual
- Smooth
- Mobile-first
- Clean
- Premium wellness/class booking marketplace
- Inspired by Mindbody-style booking flow, but do not copy Mindbody exactly
- Use modern cards, images, gradients, subtle animations, illustrations, and strong CTAs
- Avoid old-school dashboard look
- Avoid plain text-heavy layouts
- Avoid dull grey-heavy design

Important product flow change:
The first screen should focus on available live/upcoming schedules/classes, not just a marketing hero.

Preferred customer flow:
1. User lands on homepage.
2. Homepage shows live/upcoming class schedule immediately.
3. User can browse classes without login.
4. When user clicks Book Now, ask user to login or sign up.
5. User enters email first.
6. System should later check whether the email belongs to:
   - existing customer
   - existing owner
   - new user
7. For now, since we may not have backend/auth yet, create the UI flow only:
   - Email entry screen/modal
   - Existing customer state
   - Existing owner state
   - New user signup state
8. If new user, show customer registration form with email pre-filled.
9. Make the flow feel smooth and simple.

Important:
If backend/auth is not available yet, implement this as UI/mock flow only.
Do not create real authentication unless current phase allows it.
Use mock logic or placeholder comments explaining where real backend/auth will be connected later.

Customer entry flow requirements:
- Add a login/signup prompt when booking.
- First ask for email only.
- Based on mock conditions, show one of these flows:
  1. Existing customer: show “Continue as customer”
  2. Existing owner: show “This email is registered as an owner. Go to Owner Dashboard”
  3. New user: show customer registration form
- Customer registration form should auto-fill the email entered earlier.
- Registration form should ask:
  - Full name
  - Email pre-filled and editable only if needed
  - Phone number
  - Password field only as UI placeholder if auth phase is not active
- Booking summary should remain visible while registering.
- User should not lose selected class during login/signup flow.

Owner flow requirements:
- Owner should have a clean workspace/dashboard.
- Owner should be able to create a class visually.
- Owner class creation form should include image upload UI.
- Since real upload/database may not exist yet, image upload can be UI-only or local preview only if current phase allows.
- If no image is uploaded, show a polished default class image template.
- Default image template should look modern, not broken.
- Add placeholder logic/comments for future AI-generated class images.

Future AI Image Requirement:
Document this in PROJECT_MASTER_PLAN.md but do not build real AI generation yet.

Future behavior:
- Owner can upload an image for a class.
- If owner does not upload an image, the platform can auto-generate or assign a template image.
- Later, an AI image model can generate class images based on:
  - Class title
  - Category
  - Instructor
  - Mood/style
  - Business branding
- For now:
  - Use static modern placeholder image cards/templates.
  - Add comments or TODO notes where AI image generation will be integrated later.
  - Do not call any AI image API yet.

UI improvement requirements:

1. Homepage
Change homepage from a static hero into a marketplace-first landing page.

Homepage should include:
- Top navigation
- Hero section with modern visuals
- Live/upcoming schedule section near the top
- Search/filter bar UI
- Featured class cards with images
- Category chips
- Clear CTA buttons
- Login/signup prompt
- Owner CTA but less dominant than customer booking flow

Homepage priority:
Customer should immediately see available classes and feel encouraged to book.

2. Live Schedule Section
Add a modern live schedule/upcoming classes section.

Each schedule card should show:
- Class image or template image
- Class title
- Category
- Business name
- Date
- Time
- Location
- Price
- Seats left
- Status badge: Available, Few seats left, Full
- Book Now button

Use a more visual layout than plain list rows.

3. Class Cards
Improve class cards.

Cards should include:
- Image area
- Category badge
- Class title
- Business name
- Date/time
- Location
- Price
- Seats left
- Book/View Details CTA
- Smooth hover effect
- Good mobile layout

4. Class Detail Page
Make class detail page more visual.

Include:
- Large class image/banner
- Class title
- Category badge
- Business name
- Instructor
- Date/time
- Location
- Price
- Seats left
- Description
- What to expect section
- Booking summary panel
- Sticky or clear Book Now button on mobile if simple

5. Booking/Login Flow
When user clicks Book Now:
- Show smooth login/signup modal or dedicated page.
- First step: email input.
- Second step: customer registration or continue flow.
- Show selected class summary beside/below the form.
- Make the form friendly and short.
- Use progress indicators if helpful:
  Step 1: Email
  Step 2: Details
  Step 3: Confirm

6. Owner Dashboard
Make owner dashboard more modern and useful.

Owner dashboard should include:
- Modern sidebar
- Welcome header
- Summary cards
- Today’s schedule
- Recent bookings
- Quick actions
- Clean class cards/table
- Modern status badges
- Clear “Create Class” button

Avoid boring enterprise UI.

7. Create Class Form
Improve create class form heavily.

Group fields into sections:
- Class image
- Basic details
- Schedule
- Pricing and capacity
- Location
- Visibility/status

Class image section:
- Show upload area
- Show preview if selected
- Show default template preview if no image
- Add note: “No image? We’ll use a clean class template for now. AI-generated images can be added later.”
- Do not build real AI generation yet.

8. Visual Design
Use:
- Larger cards
- Rounded corners
- Modern gradients
- Subtle shadows
- Soft animations
- Better typography
- Better spacing
- Image placeholders
- Illustration-like sections if simple
- Microcopy for guidance

Animations:
Add subtle animations only if easy and lightweight:
- hover effects
- button transitions
- card lift on hover
- smooth modal transitions
- no heavy animation libraries unless absolutely necessary

9. Light and Dark Mode
Keep light/dark mode working.

Make sure:
- Cards work in both modes
- Text has good contrast
- Buttons are visible
- Forms are readable
- Image/template cards look good in both modes

10. Mobile-first
This platform will be used heavily by younger users, so mobile UX matters.

Ensure:
- Homepage looks good on mobile
- Class cards stack nicely
- Booking flow is easy on mobile
- CTAs are easy to tap
- Owner dashboard does not break on mobile
- Tables should become cards on mobile if needed

11. Documentation Requirement
Update PROJECT_MASTER_PLAN.md after this UI task.

Add or update a section called:

UI Change Log

For every UI change, add pointers in this format:

1. Page or Component:
   - Changed:
   - Why:
   - User benefit:
   - Files changed:
   - How to test:

Also update roadmap notes with:
- Future AI-generated class image requirement
- Current behavior: static/default image templates only
- Future behavior: owner upload + AI-generated fallback image

12. Code Quality Rules
- Keep code beginner-friendly.
- Keep components readable.
- Do not create too many abstractions.
- Do not add unused files.
- Do not add external libraries unless absolutely necessary.
- If you add a dependency, explain why before doing it.
- Do not remove working routes.
- Do not change backend/auth/payment scope.
- Keep this as UI/mock flow only if backend is not active.

13. Final Output Required
After completing this UI/UX update:
1. Explain the improved user flow.
2. Explain all UI changes made.
3. List every file created or edited.
4. List what is still mock/placeholder.
5. List what will become real in later phases.
6. Update PROJECT_MASTER_PLAN.md with UI Change Log.
7. Tell me exactly how to test:
   - homepage live schedule
   - class card UI
   - class detail page
   - Book Now login/signup flow
   - customer registration email pre-fill
   - owner dashboard
   - create class image upload/default image UI
   - dark mode/light mode
   - mobile responsiveness
8. Stop and ask me to test.
9. Do not continue to the next phase.