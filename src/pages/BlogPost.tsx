import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import BlogHeader from "@/components/BlogHeader";
import CommentsSection from "@/components/CommentsSection";
import SocialMediaLinks from "@/components/SocialMediaLinks";
import YouTubeModal from "@/components/YouTubeModal";
import EnhancedPromotionalPopup from "@/components/EnhancedPromotionalPopup";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  author_id: string;
  author_name: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
  is_published: boolean | null;
  social_handles?: any;
  media_items?: any;
  created_at: string | null;
  updated_at: string | null;
}

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { trackPostEngagement } = useAnalytics();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [youtubeModal, setYoutubeModal] = useState<{isOpen: boolean, url: string, title?: string}>({
    isOpen: false,
    url: '',
    title: ''
  });

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching post with ID:', id);
        
        // First try to fetch by ID
        let { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .eq('is_published', true)
          .single();

        // If not found by ID, try by slug
        if (error && error.code === 'PGRST116') {
          console.log('Post not found by ID, trying by slug...');
          const { data: slugData, error: slugError } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', id)
            .eq('is_published', true)
            .single();
          
          data = slugData;
          error = slugError;
        }

        if (error) {
          console.error('Error fetching post:', error);
          if (error.code === 'PGRST116') {
            console.log('Post not found in database');
          }
          setPost(null);
        } else {
          console.log('Post fetched successfully:', data);
          setPost(data);
          
          // Track post view with enhanced analytics
          await trackPostEngagement(data.id, 'view', {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            page_url: window.location.href
          });
        }
      } catch (error) {
        console.error('Unexpected error fetching post:', error);
        toast({
          title: "Error",
          description: "Failed to load blog post",
          variant: "destructive",
        });
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, toast, trackPostEngagement]);

  const handleLike = async () => {
    if (post) {
      await trackPostEngagement(post.id, 'like', {
        timestamp: new Date().toISOString(),
        action: 'like_button_click'
      });
    }
  };

  const handleShare = async () => {
    if (post) {
      await trackPostEngagement(post.id, 'share', {
        timestamp: new Date().toISOString(),
        action: 'share_button_click',
        share_url: window.location.href
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BlogHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BlogHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <p className="text-gray-600 mb-6 sm:mb-8">The blog post you're looking for doesn't exist or has been removed.</p>
          <Link to="/">
            <Button>← Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderMediaItem = (item: any) => {
    if (item.type === 'image') {
      return (
        <div className="my-4 sm:my-6">
          <img 
            src={item.url} 
            alt={item.caption || "Post image"} 
            className="w-full h-auto rounded-lg shadow-lg"
          />
          {item.caption && (
            <p className="text-sm text-gray-600 mt-2 text-center italic">{item.caption}</p>
          )}
          {item.paragraphText && (
            <div 
              className="mt-4 prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: item.paragraphText }}
            />
          )}
        </div>
      );
    } else if (item.type === 'video') {
      const videoId = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      return (
        <div className="my-4 sm:my-6">
          <div className="relative w-full group cursor-pointer" style={{ paddingBottom: '56.25%' }}>
            <div 
              className="absolute inset-0 bg-black rounded-lg overflow-hidden"
              onClick={() => setYoutubeModal({isOpen: true, url: item.url, title: item.caption})}
            >
              <img 
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-50 transition-all">
                <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-white fill-current" />
                </div>
              </div>
            </div>
          </div>
          {item.caption && (
            <p className="text-sm text-gray-600 mt-2 text-center italic">{item.caption}</p>
          )}
          {item.paragraphText && (
            <div 
              className="mt-4 prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: item.paragraphText }}
            />
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogHeader />
      
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 sm:mb-8 transition-colors">
          ← Back to Blog
        </Link>

        {/* Article Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="secondary">{post.category || "General"}</Badge>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500 text-sm">{formatDate(post.published_at || post.created_at)}</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight mb-4">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="text-lg sm:text-xl text-gray-600 mb-4 sm:mb-6">
              {post.excerpt}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4 sm:pb-6 gap-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarFallback>
                  <User className="h-5 w-5 sm:h-6 sm:w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">By {post.author_name || "Unknown Author"}</p>
                <p className="text-xs sm:text-sm text-gray-500">Published on {formatDate(post.published_at || post.created_at)}</p>
              </div>
            </div>
            
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {post.image_url && (
          <div className="mb-6 sm:mb-8">
            <img 
              src={post.image_url} 
              alt={post.title}
              className="w-full h-48 sm:h-64 lg:h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Article Content */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          {post.content ? (
            <div 
              className="prose prose-sm sm:prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <p className="text-gray-600">No content available for this post.</p>
          )}
          
          {/* Additional Media Items */}
          {post.media_items && Array.isArray(post.media_items) && post.media_items.length > 0 && (
            <div className="mt-6 sm:mt-8">
              {post.media_items.map((item: any, index: number) => (
                <div key={item.id || index}>
                  {renderMediaItem(item)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Social Media Links */}
        {post.social_handles && (
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
            <SocialMediaLinks socialHandles={post.social_handles} />
          </div>
        )}

        {/* Comments and Social Interactions */}
        <CommentsSection 
          postId={post.id} 
          onLike={handleLike}
          onShare={handleShare}
        />

        {/* Article Footer */}
        <footer className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enjoyed this article?</h3>
              <div className="text-sm text-gray-600">
                Share it with your network and leave a comment below!
              </div>
            </div>
            <Link to="/">
              <Button className="w-full sm:w-auto">Read More Articles</Button>
            </Link>
          </div>
        </footer>
      </article>

      {/* YouTube Modal */}
      <YouTubeModal
        isOpen={youtubeModal.isOpen}
        onClose={() => setYoutubeModal({isOpen: false, url: '', title: ''})}
        videoUrl={youtubeModal.url}
        title={youtubeModal.title}
      />

      {/* Enhanced Promotional Popup */}
      <EnhancedPromotionalPopup currentPage="/post" />
    </div>
  );
};

export default BlogPost;