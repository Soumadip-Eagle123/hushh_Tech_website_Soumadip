/**
 * Community List — UI / Presentation (Revamped)
 * Apple iOS colors, Playfair Display headings, proper English capitalization.
 * Matches Home + Fund A design language.
 * Logic stays in logic.ts — zero data here.
 */
import { Link } from "react-router-dom";
import { useCommunityListLogic } from "./logic";
import HushhTechBackHeader from "../../components/hushh-tech-back-header/HushhTechBackHeader";
import HushhTechFooter, {
  HushhFooterTab,
} from "../../components/hushh-tech-footer/HushhTechFooter";
import NDARequestModal from "../../components/NDARequestModal";
import NDADocumentModal from "../../components/NDADocumentModal";

/* ── Playfair heading style ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

export default function CommunityPage() {
  const {
    filteredContent,
    dropdownOptions,
    apiLoading,
    selectedCategory,
    searchQuery,
    setSearchQuery,
    ndaApproved,
    showNdaModal,
    setShowNdaModal,
    showNdaDocModal,
    setShowNdaDocModal,
    ndaMetadata,
    session,
    onCategoryChange,
    handleBackClick,
    handlePostClick,
    setNdaApproved,
    getPostDescription,
    formatDisplayDate,
    getPostUrl,
    toTitleCase,
    NDA_OPTION,
  } = useCommunityListLogic();

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      {/* ═══ Header ═══ */}
      <HushhTechBackHeader
        onBackClick={handleBackClick}
        rightType="hamburger"
      />

      {/* ═══ Main ═══ */}
      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-32">
        {/* ── Hero ── */}
        <section className="pt-6 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-hushh-blue/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-hushh-blue rounded-full" />
            <span className="text-[10px] tracking-[0.15em] uppercase font-medium text-hushh-blue">
              Community
            </span>
          </div>

          <h1
            className="text-[2.75rem] leading-[1.1] font-normal text-black tracking-tight font-serif"
            style={playfair}
          >
            Latest <br />
            <span className="text-gray-400 italic font-light">Updates.</span>
          </h1>
          <p className="text-[13px] text-gray-400 font-light mt-4 leading-relaxed max-w-xs">
            Insights, news, and privacy technology updates from Hushh Technologies.
          </p>
        </section>

        {/* ── Search ── */}
        <section className="mb-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 !text-[1.15rem]">
              search
            </span>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 bg-white text-[13px] text-black placeholder:text-gray-400 font-light focus:outline-none focus:border-hushh-blue transition-colors"
            />
          </div>
        </section>

        {/* ── Category Filter ── */}
        <section className="mb-8">
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border border-gray-200 bg-white text-[13px] text-black font-light appearance-none focus:outline-none focus:border-hushh-blue transition-colors cursor-pointer"
            >
              {dropdownOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "All" ? "Category: All" : toTitleCase(opt)}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 !text-[1.15rem] pointer-events-none">
              expand_more
            </span>
          </div>
        </section>

        {/* ── Post List ── */}
        {apiLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-hushh-blue rounded-full animate-spin" />
          </div>
        ) : filteredContent.length > 0 ? (
          <div className="space-y-0">
            {filteredContent.map((post, index) => (
              <Link
                key={post.id}
                to={getPostUrl(post)}
                className="block group"
                onClick={() => handlePostClick(post)}
              >
                <article
                  className={`py-6 ${
                    index < filteredContent.length - 1
                      ? "border-b border-gray-200"
                      : ""
                  }`}
                >
                  {/* date pill */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] tracking-[0.15em] uppercase font-medium text-gray-400">
                      {formatDisplayDate(post.date)}
                    </span>
                    <div className="h-px w-6 bg-gray-200" />
                    {post.category && (
                      <span className="text-[10px] tracking-[0.1em] uppercase text-hushh-blue/70 font-light">
                        {post.category}
                      </span>
                    )}
                  </div>

                  {/* title */}
                  <h3 className="text-[15px] font-semibold text-black leading-snug mb-2 group-hover:text-hushh-blue transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  {/* description */}
                  <p className="text-[12px] text-gray-400 font-light leading-relaxed line-clamp-2 mb-3">
                    {getPostDescription(post)}
                  </p>

                  {/* read more */}
                  <div className="flex items-center gap-1 text-hushh-blue">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                      Read More
                    </span>
                    <span className="material-symbols-outlined !text-[0.85rem] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 !text-[1.5rem]">
                {searchQuery ? "search_off" : "article"}
              </span>
            </div>
            <p className="text-[13px] text-gray-500 font-light mb-1">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : selectedCategory === NDA_OPTION && !ndaApproved
                  ? "Please complete NDA approval to view sensitive documents."
                  : "No content available."}
            </p>
            {searchQuery && (
              <p className="text-[11px] text-gray-400 font-light">
                Try adjusting your search terms or browse by category.
              </p>
            )}
          </div>
        )}
      </main>

      {/* ═══ Footer Nav ═══ */}
      <HushhTechFooter activeTab={HushhFooterTab.COMMUNITY} />

      {/* ═══ NDA Modals ═══ */}
      <NDARequestModal
        isOpen={showNdaModal}
        onClose={() => setShowNdaModal(false)}
        session={session}
        onSubmit={() => {}}
      />
      <NDADocumentModal
        isOpen={showNdaDocModal}
        onClose={() => setShowNdaDocModal(false)}
        session={session}
        ndaMetadata={ndaMetadata}
        onAccept={() => {
          setNdaApproved(true);
          setShowNdaDocModal(false);
        }}
      />
    </div>
  );
}
